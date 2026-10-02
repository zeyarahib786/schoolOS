import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './certificates.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listCertificates(
    req.query as unknown as Parameters<typeof service.listCertificates>[0],
    requester,
  );
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const issue = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const certificate = await service.issueCertificate(req.body, requester);
  sendSuccess(res, 201, certificate);
});

export const decide = asyncHandler(async (req: Request, res: Response) => {
  const certificate = await service.decideCertificate(req.params.id, req.body.decision, requireUser(req));
  sendSuccess(res, 200, certificate);
});
