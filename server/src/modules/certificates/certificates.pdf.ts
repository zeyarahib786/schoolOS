import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { nativeSigningIdentity, NativePdfSigner } from '../../utils/pdfSigner';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import { SignPdf } from '@signpdf/signpdf';
import { Certificate } from '../../models/Certificate';
import { CertificatePdf, ICertificatePdf } from '../../models/CertificatePdf';
import { Student } from '../../models/Student';
import { AuthenticatedUser } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { scopeCertificateFilter } from './certificates.ownership';
import { findAuthorizedStudentIds } from './certificates.repository';
import { getSettings } from '../settings/settings.repository';
import { logAudit } from '../audit/audit.service';
export function pdfSigningStatus() {
  return { configured: Boolean(process.env.PDF_SIGNING_P12_PATH), mode: 'PKCS12', unsignedAvailable: true };
}
async function signingIdentity() {
  if (!process.env.PDF_SIGNING_P12_PATH)
    throw new ApiError(503, 'PDF_SIGNING_UNCONFIGURED', 'Authorized school signing certificate is not configured');
  try {
    const bytes = await readFile(process.env.PDF_SIGNING_P12_PATH);
    if (bytes.length > 1024 * 1024) throw Error('Oversized certificate');
    const passphrase = process.env.PDF_SIGNING_P12_PASSPHRASE || '';
    return await nativeSigningIdentity(bytes, passphrase);
  } catch {
    throw new ApiError(
      503,
      'PDF_SIGNING_INVALID',
      'Signing certificate is unavailable, expired, or invalid; contact the school administrator',
    );
  }
}
async function renderUnsigned(certificate: InstanceType<typeof Certificate>) {
  const settings = await getSettings(),
    student = await Student.findById(certificate.student).select('name refId grade');
  if (!student) throw ApiError.notFound('Student record not found');
  const snapshot = certificate.assessmentSnapshot;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(certificate.type + ' ' + certificate.certNumber);
  pdf.setAuthor(settings.schoolName);
  pdf.setSubject('Issued school record');
  pdf.setCreationDate(certificate.issuedDate || certificate.createdAt);
  let font: PDFFont;
  const custom = process.env.PDF_FONT_PATH;
  const bundled = resolve(__dirname, '../../../assets/fonts/NotoSansArabic.ttf');
  try {
    font = await pdf.embedFont(await readFile(custom || bundled), { subset: true });
  } catch {
    if (custom) throw new ApiError(503, 'PDF_FONT_UNAVAILABLE', 'Configured PDF font is unavailable');
    font = await pdf.embedFont(StandardFonts.Helvetica);
  }
  let page = pdf.addPage([595.28, 841.89]),
    y = 780;
  const write = (text: string, size = 11, color = rgb(0.15, 0.2, 0.25)) => {
    const words = text.replace(/[\r\n\t]/g, ' ').split(' ');
    let line = '';
    const draw = () => {
      if (y < 90) {
        page = pdf.addPage([595.28, 841.89]);
        y = 780;
      }
      page.drawText(line, { x: 48, y, size, font, color });
      y -= size + 8;
    };
    for (const word of words) {
      let candidate = line ? line + ' ' + word : word;
      try {
        if (font.widthOfTextAtSize(candidate, size) > 495 && line) {
          draw();
          line = '';
          candidate = word;
        }
        while (font.widthOfTextAtSize(candidate, size) > 495 && candidate.length > 1) {
          const part = candidate.slice(
            0,
            Math.max(1, Math.floor((candidate.length * 495) / font.widthOfTextAtSize(candidate, size))),
          );
          line = part;
          draw();
          candidate = candidate.slice(part.length);
        }
        line = candidate;
      } catch {
        throw new ApiError(503, 'PDF_FONT_REQUIRED', 'Configure a Unicode PDF font for this record');
      }
    }
    if (line) draw();
  };
  write(settings.schoolName, 20, rgb(0.05, 0.4, 0.2));
  if (settings.address) write(settings.address, 9);
  y -= 16;
  write(snapshot ? 'Assessment report card' : certificate.type + ' certificate', 17);
  write('Reference: ' + certificate.certNumber);
  write('Issued: ' + (certificate.issuedDate || certificate.createdAt).toISOString().slice(0, 10));
  y -= 12;
  write('Student: ' + (snapshot?.studentName || student.name));
  write('Admission ID: ' + (snapshot?.studentRef || student.refId));
  write('Class: ' + (snapshot?.grade || student.grade));
  if (snapshot) {
    write('Assessment: ' + snapshot.examName);
    write('Term: ' + snapshot.term);
    y -= 12;
    for (const score of snapshot.scores) write(score.subject + ': ' + score.marks + ' / ' + snapshot.maxMarks);
    write('Average: ' + snapshot.averagePercent + '%');
    write('Grade: ' + snapshot.letterGrade);
    write('Pass threshold: ' + snapshot.passMark + ' / ' + snapshot.maxMarks);
    write('This report preserves the original issued assessment snapshot.', 9);
  } else {
    y -= 14;
    write('This record confirms the school registry details shown above.');
    if (certificate.purpose) write('Purpose: ' + certificate.purpose);
  }
  y -= 20;
  write('School office: ' + (settings.principal || settings.schoolName));
  write('Verify the PDF signatures panel. Registry copies without an authorized digital signature are unsigned.', 9);
  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}
export async function certificatePdf(id: string, signed: boolean, user: AuthenticatedUser) {
  const ids = ['Administrator', 'Principal', 'Teacher'].includes(user.role)
    ? []
    : await findAuthorizedStudentIds(user.id, user.role);
  const cert = await Certificate.findOne(scopeCertificateFilter({ _id: id, status: 'Issued' }, user, ids));
  if (!cert) throw ApiError.notFound('Issued certificate not found');
  const loadAsset = () => CertificatePdf.findOne<ICertificatePdf>({ certificate: id, signed }).select('+content');
  let asset: ICertificatePdf | null = await loadAsset();
  if (asset) return asset;
  if (signed && !['Administrator', 'Principal'].includes(user.role))
    throw ApiError.forbidden('The school office must sign this record before a signed download is available');
  const unsignedExisting = await CertificatePdf.findOne({ certificate: id, signed: false }).select('+content');
  const bytes = unsignedExisting ? Buffer.from(unsignedExisting.content) : await renderUnsigned(cert);
  let content: Buffer = bytes,
    fingerprint: string | undefined;
  if (signed) {
    const identity = await signingIdentity();
    const pdf = await PDFDocument.load(bytes);
    pdflibAddPlaceholder({
      pdfDoc: pdf,
      reason: 'Official school record ' + cert.certNumber,
      contactInfo: 'School office',
      name: identity.name,
      location: 'School office',
      signatureLength: 16384,
    });
    content = await new SignPdf().sign(
      Buffer.from(await pdf.save({ useObjectStreams: false })),
      new NativePdfSigner(identity),
    );
    fingerprint = identity.fingerprint;
  }
  const sha256 = createHash('sha256').update(content).digest('hex');
  try {
    await CertificatePdf.updateOne(
      { certificate: id, signed },
      {
        $setOnInsert: { content, sha256, signed, signerFingerprint: fingerprint, createdBy: user.id, certificate: id },
      },
      { upsert: true },
    );
    asset = await loadAsset();
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    asset = await loadAsset();
  }
  if (!asset) throw ApiError.internal('PDF could not be saved');
  await logAudit(
    (signed ? 'Digitally signed' : 'Generated unsigned') + ' certificate PDF ' + id,
    'Certificates',
    user.id,
  );
  return asset;
}
