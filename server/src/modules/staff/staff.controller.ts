import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './staff.service';
import * as documents from './staff-documents.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listStaff(req.query as unknown as Parameters<typeof service.listStaff>[0], requester);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const staff = await service.getStaff(req.params.id, requester);
  sendSuccess(res, 200, staff);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const staff = await service.createStaff(req.body, requireUser(req));
  sendSuccess(res, 201, staff);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const staff = await service.updateStaff(req.params.id, req.body, requireUser(req));
  sendSuccess(res, 200, staff);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteStaff(req.params.id, requireUser(req));
  sendSuccess(res, 200, { message: 'Staff record deleted' });
});

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const filename = decodeURIComponent(String(req.headers['x-file-name'] || 'document'));
  const document = await documents.uploadDocument(
    req.params.id,
    req.params.key as documents.StaffDocumentKey,
    filename,
    String(req.headers['content-type'] || ''),
    req.body as Buffer,
    requireUser(req),
  );
  sendSuccess(res, 201, document);
});
export const downloadDocument = asyncHandler(async (req: Request, res: Response) => {
  const result = await documents.getDocument(
    req.params.id,
    req.params.key as documents.StaffDocumentKey,
    requireUser(req),
  );
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', result.document.contentType);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.document.filename)}`);
  res.setHeader('Content-Length', result.document.size);
  result.stream.on('error', (error) => res.destroy(error));
  result.stream.pipe(res);
});
export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  await documents.deleteDocument(req.params.id, req.params.key as documents.StaffDocumentKey, requireUser(req));
  sendSuccess(res, 200, { message: 'Staff document deleted' });
});
export const toggleOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const staff = await documents.toggleOnboarding(req.params.id, req.params.key, requireUser(req));
  sendSuccess(res, 200, staff);
});

export const linkAccount = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.linkStaffAccount(req.params.id, req.body, requireUser(req)));
});
