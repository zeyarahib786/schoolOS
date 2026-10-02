import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './expenses.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listClaims(req.query as unknown as Parameters<typeof service.listClaims>[0], requester);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const claim = await service.submitClaim(req.body, requester);
  sendSuccess(res, 201, claim);
});

export const review = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const claim = await service.reviewClaim(req.params.id, req.body, requester);
  sendSuccess(res, 200, claim);
});
