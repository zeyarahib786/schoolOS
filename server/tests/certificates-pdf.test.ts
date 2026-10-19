import request from 'supertest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { createApp } from '../src/app';
import { Student } from '../src/models/Student';
import { Certificate } from '../src/models/Certificate';
import { CertificatePdf } from '../src/models/CertificatePdf';
import { certificatePdf } from '../src/modules/certificates/certificates.pdf';
import { Role } from '../src/types/roles';
const app = createApp();
let dir: string;
async function account(role: Role, name: string) {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name, email: name + '@example.invalid', password: 'StrongPass123', role });
  expect(r.status).toBe(201);
  return r.body.data;
}
const auth = (u: { accessToken: string }) => ({ Authorization: 'Bearer ' + u.accessToken });
async function fixture() {
  const a = await account('Principal', 'pdf-admin'),
    p = await account('Parent', 'pdf-parent'),
    s = await Student.create({
      refId: 'PDF-QA',
      name: 'QA Student',
      grade: 'Grade 7 A',
      gender: 'Female',
      roll: '007',
      guardianName: 'QA Parent',
      guardianUserId: p.user._id,
      phone: '123456789',
    });
  const c = await Certificate.create({
    certNumber: 'CERT-QA',
    student: s._id,
    type: 'ReportCard',
    issuedBy: a.user._id,
    issuedDate: new Date(),
    assessmentSnapshot: {
      examName: 'QA Assessment',
      term: 'Term 1',
      studentName: s.name,
      studentRef: s.refId,
      grade: s.grade,
      maxMarks: 50,
      passMark: 25,
      averagePercent: 60,
      letterGrade: 'B',
      scores: [{ subject: 'Math', marks: 30 }],
    },
  });
  return { a, p, s, c };
}
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'schoolos-pdf-test-'));
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      join(dir, 'key.pem'),
      '-out',
      join(dir, 'cert.pem'),
      '-days',
      '1',
      '-subj',
      '/CN=SchoolOS QA only - NOT a school identity',
      '-addext',
      'keyUsage=digitalSignature',
    ],
    { stdio: 'ignore' },
  );
  execFileSync(
    'openssl',
    [
      'pkcs12',
      '-export',
      '-inkey',
      join(dir, 'key.pem'),
      '-in',
      join(dir, 'cert.pem'),
      '-out',
      join(dir, 'qa.p12'),
      '-passout',
      'pass:LocalFixtureOnly123!',
    ],
    { stdio: 'ignore' },
  );
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));
afterEach(() => {
  delete process.env.PDF_SIGNING_P12_PATH;
  delete process.env.PDF_SIGNING_P12_PASSPHRASE;
});
describe('Issued certificate PDF signing', () => {
  it('serves actual immutable PDF bytes and keeps family downloads ownership-scoped', async () => {
    const { a, p, s, c } = await fixture(),
      stranger = await account('Parent', 'pdf-stranger');
    const first = await certificatePdf(c.id, false, { id: a.user._id, role: 'Principal' });
    expect(Buffer.from(first.content).subarray(0, 5).toString()).toBe('%PDF-');
    s.name = 'Changed name';
    await s.save();
    const again = await certificatePdf(c.id, false, { id: p.user._id, role: 'Parent' });
    expect(again.sha256).toBe(first.sha256);
    expect(await CertificatePdf.countDocuments()).toBe(1);
    expect(
      (
        await request(app)
          .get('/api/v1/certificates/' + c.id + '/pdf')
          .set(auth(stranger))
      ).status,
    ).toBe(404);
    const response = await request(app)
      .get('/api/v1/certificates/' + c.id + '/pdf')
      .set(auth(p));
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['x-pdf-signed']).toBe('false');
    expect(response.headers['cache-control']).toBe('private, no-store');
  });
  it('fails clearly without configured school identity and denies signing by Teacher/family', async () => {
    const { a, p, c } = await fixture(),
      t = await account('Teacher', 'pdf-teacher');
    expect(
      (
        await request(app)
          .get('/api/v1/certificates/' + c.id + '/pdf?signed=true')
          .set(auth(a))
      ).status,
    ).toBe(503);
    expect(
      (
        await request(app)
          .get('/api/v1/certificates/' + c.id + '/pdf?signed=true')
          .set(auth(p))
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get('/api/v1/certificates/' + c.id + '/pdf?signed=true')
          .set(auth(t))
      ).status,
    ).toBe(403);
    expect(await CertificatePdf.countDocuments()).toBe(0);
  });
  it('produces a genuine CMS signature verified by OpenSSL, rejects tampering and allows owned download after signing', async () => {
    const { a, p, c } = await fixture();
    process.env.PDF_SIGNING_P12_PATH = join(dir, 'qa.p12');
    process.env.PDF_SIGNING_P12_PASSPHRASE = 'LocalFixtureOnly123!';
    const asset = await certificatePdf(c.id, true, { id: a.user._id, role: 'Principal' }),
      bytes = Buffer.from(asset.content),
      text = bytes.toString('latin1');
    expect(asset.signed).toBe(true);
    expect(asset.signerFingerprint).toMatch(/^[a-f\d]{64}$/);
    const ranges = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/.exec(text);
    expect(ranges).not.toBeNull();
    const [start, length, second, secondLength] = ranges!.slice(1).map(Number),
      covered = Buffer.concat([bytes.subarray(start, start + length), bytes.subarray(second, second + secondLength)]),
      hex = text.slice(length + 1, second - 1).replace(/[^a-f\d]/gi, '');
    const padded = Buffer.from(hex, 'hex'),
      lengthBytes = padded[1] & 0x7f,
      headerLength = padded[1] & 0x80 ? 2 + lengthBytes : 2,
      derLength = padded[1] & 0x80 ? padded.readUIntBE(2, lengthBytes) : padded[1];
    writeFileSync(join(dir, 'signature.der'), padded.subarray(0, headerLength + derLength));
    writeFileSync(join(dir, 'covered.bin'), covered);
    expect(() =>
      execFileSync(
        'openssl',
        [
          'cms',
          '-verify',
          '-binary',
          '-inform',
          'DER',
          '-in',
          join(dir, 'signature.der'),
          '-content',
          join(dir, 'covered.bin'),
          '-noverify',
        ],
        { stdio: 'pipe' },
      ),
    ).not.toThrow();
    covered[10] ^= 1;
    writeFileSync(join(dir, 'covered.bin'), covered);
    expect(() =>
      execFileSync(
        'openssl',
        [
          'cms',
          '-verify',
          '-binary',
          '-inform',
          'DER',
          '-in',
          join(dir, 'signature.der'),
          '-content',
          join(dir, 'covered.bin'),
          '-noverify',
        ],
        { stdio: 'pipe' },
      ),
    ).toThrow();
    const owned = await certificatePdf(c.id, true, { id: p.user._id, role: 'Parent' });
    expect(owned.sha256).toBe(asset.sha256);
  });
  it('rejects wrong passphrases and pending/rejected records without publishing a PDF', async () => {
    const { a, c } = await fixture();
    process.env.PDF_SIGNING_P12_PATH = join(dir, 'qa.p12');
    process.env.PDF_SIGNING_P12_PASSPHRASE = 'incorrect';
    expect(
      (
        await request(app)
          .get('/api/v1/certificates/' + c.id + '/pdf?signed=true')
          .set(auth(a))
      ).status,
    ).toBe(503);
    await Certificate.findByIdAndUpdate(c.id, { status: 'Pending' });
    expect(
      (
        await request(app)
          .get('/api/v1/certificates/' + c.id + '/pdf')
          .set(auth(a))
      ).status,
    ).toBe(404);
    expect(await CertificatePdf.countDocuments()).toBe(0);
  });
});
