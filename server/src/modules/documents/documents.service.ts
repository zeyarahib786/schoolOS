import { Counter } from '../../models/Counter';
import { ApiError } from '../../utils/ApiError';
import { ISchoolDocument, SchoolDocument } from '../../models/SchoolDocument';
import * as repo from './documents.repository';
import { ListDocumentsQuery, PublishDocumentInput } from './documents.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role, WRITE_ROLES } from '../../types/roles';
import { logAudit } from '../audit/audit.service';
import mongoose from 'mongoose';
import { Readable } from 'stream';

const MAX_PDF_SIZE = 8 * 1024 * 1024;
function bucket() {
  if (!mongoose.connection.db) throw ApiError.internal('Database is not ready');
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'schoolDocuments' });
}

function canPublish(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

/** Open read: policies, forms, and circulars exist to be consulted by everyone at the school. */
export async function listDocuments(query: ListDocumentsQuery) {
  const { items, total } = await repo.findMany(query);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

/** Current pointer and new immutable version commit together, serialized by code. */
export async function publishDocument(
  input: PublishDocumentInput,
  requester: AuthenticatedUser,
  file?: { fileId: string; filename: string; contentType: string; size: number },
): Promise<ISchoolDocument> {
  if (!canPublish(requester.role)) throw ApiError.forbidden('Only teaching staff may publish school documents');
  const session = await mongoose.startSession();
  let document: ISchoolDocument | null = null;
  try {
    await session.withTransaction(async () => {
      const code = input.code.toUpperCase();
      await Counter.findOneAndUpdate(
        { _id: 'document-publication-' + code },
        { $inc: { seq: 1 } },
        { upsert: true, session },
      );
      const previous = await SchoolDocument.findOne({ code, isCurrent: true }).session(session);
      if (input.expectedVersion !== undefined && input.expectedVersion !== (previous?.version || 0))
        throw ApiError.conflict('Current document changed; open its current version before republishing');
      const latest = await SchoolDocument.findOne({ code }).sort({ version: -1 }).session(session);
      if (previous) await SchoolDocument.updateOne({ _id: previous._id }, { $set: { isCurrent: false } }, { session });
      document = (
        await SchoolDocument.create(
          [
            {
              code,
              title: input.title,
              category: input.category,
              description: input.description,
              publicationReason: input.publicationReason,
              version: (latest?.version || 0) + 1,
              isCurrent: true,
              publishedBy: requester.id,
              ...file,
            },
          ],
          { session },
        )
      )[0];
    });
    if (!document) throw new Error('Document transaction produced no record');
    const saved: ISchoolDocument = document;
    await logAudit(`Published document ${saved.code} v${saved.version}`, 'Documents', requester.id);
    return saved;
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw ApiError.conflict('A publication for this code was recorded concurrently; reload');
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function publishPdf(
  input: PublishDocumentInput,
  filename: string,
  content: Buffer,
  requester: AuthenticatedUser,
): Promise<ISchoolDocument> {
  if (!canPublish(requester.role)) throw ApiError.forbidden('You cannot publish documents');
  if (!Buffer.isBuffer(content) || content.length < 8 || content.length > MAX_PDF_SIZE)
    throw ApiError.badRequest('PDF must be between 8 bytes and 8 MB');
  if (
    content.subarray(0, 5).toString() !== '%PDF-' ||
    !content
      .subarray(Math.max(0, content.length - 1024))
      .toString()
      .includes('%%EOF')
  )
    throw ApiError.badRequest('The uploaded file is not a PDF');
  const safeName = filename.replace(/[\\/\0\r\n]/g, '_').slice(0, 180);
  if (!safeName.toLowerCase().endsWith('.pdf')) throw ApiError.badRequest('Filename must end in .pdf');
  const fileId = new mongoose.mongo.ObjectId();
  await new Promise<void>((resolve, reject) => {
    const stream = bucket().openUploadStreamWithId(fileId, safeName, {
      contentType: 'application/pdf',
      metadata: { code: input.code.toUpperCase() },
    });
    stream.on('finish', resolve);
    stream.on('error', reject);
    Readable.from(content).pipe(stream);
  });
  try {
    return await publishDocument(input, requester, {
      fileId: fileId.toString(),
      filename: safeName,
      contentType: 'application/pdf',
      size: content.length,
    });
  } catch (error) {
    // An audit failure can occur after the document insert; do not orphan that version.
    const saved = await SchoolDocument.exists({ fileId }).catch(() => null);
    if (!saved)
      await bucket()
        .delete(fileId)
        .catch(() => undefined);
    throw error;
  }
}

export async function getPdf(id: string) {
  const document = await SchoolDocument.findById(id);
  if (!document) throw ApiError.notFound('Document record not found');
  if (!document.fileId || !document.filename || !document.size)
    throw ApiError.notFound('No PDF is attached to this record');
  return {
    document,
    stream: bucket().openDownloadStream(new mongoose.mongo.ObjectId(document.fileId.toString())),
  };
}
