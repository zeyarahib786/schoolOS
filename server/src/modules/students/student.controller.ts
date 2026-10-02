import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './student.service';
import * as documents from './student-documents.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listStudents(
    req.query as unknown as Parameters<typeof service.listStudents>[0],
    requester,
  );
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const student = await service.getStudent(req.params.id, requester);
  sendSuccess(res, 200, student);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const student = await service.createStudent(req.body, requester);
  sendSuccess(res, 201, student);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const student = await service.updateStudent(req.params.id, req.body, requester);
  sendSuccess(res, 200, student);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  await service.deleteStudent(req.params.id, requester);
  sendSuccess(res, 200, { message: 'Student deleted' });
});

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const filename = decodeURIComponent(String(req.headers['x-file-name'] || 'document'));
  const document = await documents.uploadDocument(req.params.id, req.params.key as documents.StudentDocumentKey,
    filename, String(req.headers['content-type'] || ''), req.body as Buffer, requester);
  sendSuccess(res, 201, document);
});

export const downloadDocument = asyncHandler(async (req: Request, res: Response) => {
  const result = await documents.getDocument(req.params.id, req.params.key as documents.StudentDocumentKey, requireUser(req));
  res.setHeader('Content-Type', result.document.contentType);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.document.filename)}`);
  res.setHeader('Content-Length', result.document.size);
  result.stream.on('error', (error) => res.destroy(error)); result.stream.pipe(res);
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  await documents.deleteDocument(req.params.id, req.params.key as documents.StudentDocumentKey, requireUser(req));
  sendSuccess(res, 200, { message: 'Student document deleted' });
});
