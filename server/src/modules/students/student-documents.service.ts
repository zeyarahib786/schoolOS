import mongoose from 'mongoose';
import { Readable } from 'stream';
import { ApiError } from '../../utils/ApiError';
import { Student } from '../../models/Student';
import { AuthenticatedUser } from '../../middleware/auth';
import { assertCanReadStudent } from './student.ownership';
import { logAudit } from '../audit/audit.service';

export const DOCUMENT_KEYS = ['id', 'birth', 'photo'] as const;
export type StudentDocumentKey = (typeof DOCUMENT_KEYS)[number];
const LABELS: Record<StudentDocumentKey, string> = {
  id: 'Passport / Emirates ID',
  birth: 'Birth certificate',
  photo: 'Passport-size photo',
};
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function bucket() {
  if (!mongoose.connection.db) throw ApiError.internal('Database is not ready');
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'studentDocuments' });
}

export async function uploadDocument(
  studentId: string,
  key: StudentDocumentKey,
  filename: string,
  contentType: string,
  content: Buffer,
  requester: AuthenticatedUser,
) {
  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');
  if (!ALLOWED_TYPES.has(contentType)) throw ApiError.badRequest('Unsupported document type');
  if (!content.length || content.length > 4 * 1024 * 1024)
    throw ApiError.badRequest('Document must be between 1 byte and 4 MB');
  const safeName = filename.replace(/[\\/\0\r\n]/g, '_').slice(0, 180) || 'document';
  const fileId = new mongoose.mongo.ObjectId();
  await new Promise<void>((resolve, reject) => {
    const stream = bucket().openUploadStreamWithId(fileId, safeName, {
      contentType,
      metadata: { studentId: student._id, key },
    });
    stream.on('finish', () => resolve());
    stream.on('error', reject);
    Readable.from(content).pipe(stream);
  });
  const previous = student.documents.find((d) => d.key === key);
  student.documents = student.documents.filter((d) => d.key !== key);
  student.documents.push({
    key,
    label: LABELS[key],
    fileId: fileId as unknown as mongoose.Types.ObjectId,
    filename: safeName,
    contentType,
    size: content.length,
    uploadedAt: new Date(),
  });
  try {
    await student.save();
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
  await logAudit(`Uploaded ${LABELS[key]} for student ${student.refId}`, 'Students', requester.id);
  return student.documents.find((d) => d.key === key)!;
}

export async function getDocument(studentId: string, key: StudentDocumentKey, requester: AuthenticatedUser) {
  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');
  assertCanReadStudent(student, requester);
  if (requester.role === 'Accountant')
    throw ApiError.forbidden('Student identity documents are not available to accounting accounts');
  const document = student.documents.find((d) => d.key === key);
  if (!document) throw ApiError.notFound('Student document not found');
  return { document, stream: bucket().openDownloadStream(new mongoose.mongo.ObjectId(document.fileId.toString())) };
}

export async function deleteDocument(studentId: string, key: StudentDocumentKey, requester: AuthenticatedUser) {
  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');
  const document = student.documents.find((d) => d.key === key);
  if (!document) throw ApiError.notFound('Student document not found');
  student.documents = student.documents.filter((d) => d.key !== key);
  await student.save();
  await bucket()
    .delete(new mongoose.mongo.ObjectId(document.fileId.toString()))
    .catch(() => undefined);
  await logAudit(`Removed ${LABELS[key]} from student ${student.refId}`, 'Students', requester.id, 'Critical');
}

export async function deleteDocumentFiles(fileIds: Array<{ fileId: mongoose.Types.ObjectId }>) {
  await Promise.all(
    fileIds.map((item) =>
      bucket()
        .delete(new mongoose.mongo.ObjectId(item.fileId.toString()))
        .catch(() => undefined),
    ),
  );
}
