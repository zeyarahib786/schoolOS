import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './admissions.service';
import * as documents from './admission-documents.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listApplications(
    req.query as unknown as Parameters<typeof service.listApplications>[0],
    requester.role,
  );
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const application = await service.submitApplication(req.body, requester);
  sendSuccess(res, 201, application);
});

export const transition = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const application = await service.transition(req.params.id, req.body, requester);
  sendSuccess(res, 200, application);
});

export const enroll = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const application = await service.enroll(req.params.id, req.body, requester);
  sendSuccess(res, 200, application);
});

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const document = await documents.uploadDocument(req.params.id, req.params.key as documents.AdmissionDocumentKey, decodeURIComponent(String(req.headers['x-file-name'] || 'document')), String(req.headers['content-type'] || ''), req.body as Buffer, requireUser(req));
  sendSuccess(res, 201, document);
});

export const markDocumentReceived = asyncHandler(async (req: Request, res: Response) => {
  const document = await documents.markDocumentReceived(req.params.id, req.params.key as documents.AdmissionDocumentKey, requireUser(req));
  sendSuccess(res, 200, document);
});

export const downloadDocument = asyncHandler(async (req: Request, res: Response) => {
  const result = await documents.getDocument(req.params.id, req.params.key as documents.AdmissionDocumentKey);
  res.setHeader('Content-Type', result.document.contentType!); res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.document.filename!)}`); res.setHeader('Content-Length', result.document.size!); result.stream.on('error', (error) => res.destroy(error)); result.stream.pipe(res);
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  await documents.deleteDocument(req.params.id, req.params.key as documents.AdmissionDocumentKey, requireUser(req)); sendSuccess(res, 200, { message: 'Admission document deleted' });
});
