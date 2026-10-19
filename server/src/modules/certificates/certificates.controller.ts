import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { listCertificatesSchema } from './certificates.validation';
import * as service from './certificates.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listCertificates(listCertificatesSchema.shape.query.parse(req.query), requester);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const issue = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const certificate = await service.issueCertificate(req.body, requester);
  sendSuccess(res, 201, certificate);
});

export const decide = asyncHandler(async (req: Request, res: Response) => {
  const certificate = await service.decideCertificate(
    req.params.id,
    req.body.decision,
    requireUser(req),
    req.body.expectedUpdatedAt,
    req.body.reason,
  );
  sendSuccess(res, 200, certificate);
});

export const request = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 201, await service.requestCertificate(req.body, requireUser(req)));
});
export const requests = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.listRequests(requireUser(req)));
});
export const cancel = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.cancelRequest(req.params.id, req.body, requireUser(req)));
});
