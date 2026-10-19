import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { listAlumniSchema } from './alumni.validation';
import * as service from './alumni.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listAlumni(listAlumniSchema.shape.query.parse(req.query), requireUser(req));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const graduate = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const profile = await service.graduate(req.body, requester);
  sendSuccess(res, 201, profile);
});

export const eligibility = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.eligibility(req.params.id, requireUser(req)));
});
export const update = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.updateProfile(req.params.id, req.body, requireUser(req)));
});
