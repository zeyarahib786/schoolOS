import mongoose from 'mongoose';
import { Readable } from 'stream';
import { ApiError } from '../../utils/ApiError';
import { Staff } from '../../models/Staff';
import { AuthenticatedUser } from '../../middleware/auth';
import { assertCanReadStaff } from './staff.ownership';
import { logAudit } from '../audit/audit.service';

export const DOCUMENT_KEYS = ['id', 'degree', 'photo', 'experience', 'visa', 'attestation'] as const;
export type StaffDocumentKey = (typeof DOCUMENT_KEYS)[number];
const LABELS: Record<StaffDocumentKey, string> = {
  id: 'Passport / Emirates ID',
  degree: 'Degree certificate',
  photo: 'Passport-size photo',
  experience: 'Experience / relieving letter',
  visa: 'Visa / work permit',
  attestation: 'Certificate attestation',
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
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'staffDocuments' });
};

export async function uploadDocument(
  id: string,
  key: StaffDocumentKey,
  filename: string,
  contentType: string,
  content: Buffer,
  requester: AuthenticatedUser,
) {
  const staff = await Staff.findById(id);
  if (!staff) throw ApiError.notFound('Staff record not found');
  if (key === 'photo' && !['image/jpeg', 'image/png', 'image/webp'].includes(contentType))
    throw ApiError.badRequest('Staff photo must be a JPEG, PNG or WebP image');
  if (!TYPES.has(contentType)) throw ApiError.badRequest('Unsupported document type');
  if (!content.length || content.length > 4 * 1024 * 1024)
    throw ApiError.badRequest('Document must be between 1 byte and 4 MB');
  const name = filename.replace(/[\\/\0\r\n]/g, '_').slice(0, 180) || 'document';
  const fileId = new mongoose.mongo.ObjectId();
  await new Promise<void>((resolve, reject) => {
    const stream = bucket().openUploadStreamWithId(fileId, name, {
      contentType,
      metadata: { staffId: staff._id, key },
    });
    stream.on('finish', resolve);
    stream.on('error', reject);
    Readable.from(content).pipe(stream);
  });
  const previous = staff.documents.find((d) => d.key === key);
  staff.documents = staff.documents.filter((d) => d.key !== key);
  staff.documents.push({
    key,
    label: LABELS[key],
    fileId: fileId as unknown as mongoose.Types.ObjectId,
    filename: name,
    contentType,
    size: content.length,
    uploadedAt: new Date(),
  });
  if (key === 'id' || key === 'degree' || key === 'photo') {
    const task = staff.onboarding.find((item) => item.key === 'documents');
    if (task)
      task.done = ['id', 'degree', 'photo'].every((required) =>
        staff.documents.some((document) => document.key === required),
      );
  }
  try {
    const updated = await Staff.findOneAndUpdate(
      { _id: id, updatedAt: staff.updatedAt },
      { $set: { documents: staff.documents, onboarding: staff.onboarding } },
      { new: true, runValidators: true },
    );
    if (!updated) throw ApiError.conflict('Staff profile changed; refresh before uploading');
  } catch (error) {
    await bucket()
      .delete(fileId)
      .catch(() => undefined);
    throw error;
  }
  if (previous)
    await bucket()
      .delete(new mongoose.mongo.ObjectId(previous.fileId.toString()))
      .catch(() => undefined);
  await logAudit(`Uploaded ${LABELS[key]} for ${staff.refId}`, 'Staff & HR', requester.id);
  return staff.documents.find((d) => d.key === key)!;
}

export async function getDocument(id: string, key: StaffDocumentKey, requester: AuthenticatedUser) {
  const staff = await Staff.findById(id);
  if (!staff) throw ApiError.notFound('Staff record not found');
  assertCanReadStaff(staff, requester);
  if (requester.role === 'Accountant' && String(staff.userId) !== requester.id)
    throw ApiError.notFound('Staff document not found');
  const document = staff.documents.find((d) => d.key === key);
  if (!document) throw ApiError.notFound('Staff document not found');
  return { document, stream: bucket().openDownloadStream(new mongoose.mongo.ObjectId(document.fileId.toString())) };
}

export async function deleteDocument(id: string, key: StaffDocumentKey, requester: AuthenticatedUser) {
  const staff = await Staff.findById(id);
  if (!staff) throw ApiError.notFound('Staff record not found');
  const document = staff.documents.find((d) => d.key === key);
  if (!document) throw ApiError.notFound('Staff document not found');
  staff.documents = staff.documents.filter((d) => d.key !== key);
  const task = staff.onboarding.find((item) => item.key === 'documents');
  if (task && (key === 'id' || key === 'degree' || key === 'photo')) task.done = false;
  await staff.save();
  await bucket()
    .delete(new mongoose.mongo.ObjectId(document.fileId.toString()))
    .catch(() => undefined);
  await logAudit(`Removed ${LABELS[key]} from ${staff.refId}`, 'Staff & HR', requester.id, 'Warning');
}

export async function toggleOnboarding(id: string, key: string, requester: AuthenticatedUser) {
  const staff = await Staff.findById(id);
  if (!staff) throw ApiError.notFound('Staff record not found');
  if (staff.status !== 'Onboarding') throw ApiError.badRequest('Only onboarding staff have checklist tasks');
  const task = staff.onboarding.find((item) => item.key === key);
  if (!task) throw ApiError.notFound('Onboarding task not found');
  if (
    key === 'documents' &&
    !task.done &&
    !['id', 'degree', 'photo'].every((k) => staff.documents.some((d) => d.key === k))
  )
    throw ApiError.badRequest('Upload all required staff documents before marking them verified');
  task.done = !task.done;
  const updated = await Staff.findOneAndUpdate(
    { _id: id, status: 'Onboarding', updatedAt: staff.updatedAt },
    { $set: { onboarding: staff.onboarding } },
    { new: true, runValidators: true },
  );
  if (!updated) throw ApiError.conflict('Staff profile changed; refresh before updating the checklist');
  await logAudit(
    `${task.done ? 'Completed' : 'Reopened'} onboarding task for ${staff.refId}: ${task.label}`,
    'Staff & HR',
    requester.id,
  );
  return staff;
}
