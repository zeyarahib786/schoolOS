import mongoose from 'mongoose';
import { Readable } from 'stream';
import { ApiError } from '../../utils/ApiError';
import { AdmissionApplication } from '../../models/AdmissionApplication';
import { AuthenticatedUser } from '../../middleware/auth';
import { logAudit } from '../audit/audit.service';

export const DOCUMENT_KEYS = ['id', 'birth', 'photo', 'report', 'immun', 'tc'] as const;
export type AdmissionDocumentKey = (typeof DOCUMENT_KEYS)[number];
const LABELS: Record<AdmissionDocumentKey, string> = {
  id: 'Passport / Emirates ID',
  birth: 'Birth certificate',
  photo: 'Passport-size photo',
  report: 'Previous school report',
  immun: 'Immunisation record',
  tc: 'Transfer certificate',
};
const TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const bucket = () => {
  if (!mongoose.connection.db) throw ApiError.internal('Database is not ready');
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'admissionDocuments' });
};

export function requiredDocumentsPresent(application: {
  documents: Array<{ key: string; fileId?: unknown; verifiedAt?: Date }>;
}): boolean {
  return ['id', 'birth', 'photo'].every((key) =>
    application.documents.some((document) => document.key === key && (document.fileId || document.verifiedAt)),
  );
}

export async function uploadDocument(
  id: string,
  key: AdmissionDocumentKey,
  filename: string,
  contentType: string,
  content: Buffer,
  requester: AuthenticatedUser,
) {
  const application = await AdmissionApplication.findById(id);
  if (!application) throw ApiError.notFound('Application not found');
  if (!TYPES.has(contentType)) throw ApiError.badRequest('Unsupported document type');
  if (!content.length || content.length > 4 * 1024 * 1024)
    throw ApiError.badRequest('Document must be between 1 byte and 4 MB');
  const name = filename.replace(/[\\/\0\r\n]/g, '_').slice(0, 180) || 'document';
  const fileId = new mongoose.mongo.ObjectId();
  await new Promise<void>((resolve, reject) => {
    const stream = bucket().openUploadStreamWithId(fileId, name, {
      contentType,
      metadata: { applicationId: application._id, key },
    });
    stream.on('finish', resolve);
    stream.on('error', reject);
    Readable.from(content).pipe(stream);
  });
  const previous = application.documents.find((document) => document.key === key);
  application.documents = application.documents.filter((document) => document.key !== key);
  application.documents.push({
    key,
    label: LABELS[key],
    fileId: fileId as unknown as mongoose.Types.ObjectId,
    filename: name,
    contentType,
    size: content.length,
    uploadedAt: new Date(),
    verifiedAt: new Date(),
  });
  try {
    await application.save();
  } catch (error) {
    await bucket()
      .delete(fileId)
      .catch(() => undefined);
    throw error;
  }
  if (previous?.fileId)
    await bucket()
      .delete(new mongoose.mongo.ObjectId(previous.fileId.toString()))
      .catch(() => undefined);
  await logAudit(
    `Uploaded ${LABELS[key]} for admission application ${application.applicantName}`,
    'Admissions',
    requester.id,
  );
  return application.documents.find((document) => document.key === key)!;
}

export async function markDocumentReceived(id: string, key: AdmissionDocumentKey, requester: AuthenticatedUser) {
  const application = await AdmissionApplication.findById(id);
  if (!application) throw ApiError.notFound('Application not found');
  const existing = application.documents.find((document) => document.key === key);
  if (existing) existing.verifiedAt = new Date();
  else application.documents.push({ key, label: LABELS[key], verifiedAt: new Date() });
  await application.save();
  await logAudit(
    `Marked ${LABELS[key]} received for admission application ${application.applicantName}`,
    'Admissions',
    requester.id,
  );
  return application.documents.find((document) => document.key === key)!;
}

export async function getDocument(id: string, key: AdmissionDocumentKey) {
  const application = await AdmissionApplication.findById(id);
  if (!application) throw ApiError.notFound('Application not found');
  const document = application.documents.find((item) => item.key === key);
  if (!document?.fileId) throw ApiError.notFound('Digital admission document not found');
  return { document, stream: bucket().openDownloadStream(new mongoose.mongo.ObjectId(document.fileId.toString())) };
}

export async function deleteDocument(id: string, key: AdmissionDocumentKey, requester: AuthenticatedUser) {
  const application = await AdmissionApplication.findById(id);
  if (!application) throw ApiError.notFound('Application not found');
  const document = application.documents.find((item) => item.key === key);
  if (!document) throw ApiError.notFound('Admission document not found');
  application.documents = application.documents.filter((item) => item.key !== key);
  await application.save();
  if (document.fileId)
    await bucket()
      .delete(new mongoose.mongo.ObjectId(document.fileId.toString()))
      .catch(() => undefined);
  await logAudit(
    `Removed ${LABELS[key]} from admission application ${application.applicantName}`,
    'Admissions',
    requester.id,
    'Warning',
  );
}
