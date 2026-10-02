import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './alumni.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listAlumni(req.query as unknown as Parameters<typeof service.listAlumni>[0]);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const graduate = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const profile = await service.graduate(req.body, requester.role);
  sendSuccess(res, 201, profile);
});
