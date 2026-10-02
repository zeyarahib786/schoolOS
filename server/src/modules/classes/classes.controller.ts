import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/apiResponse';
import * as service from './classes.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listClasses(req.query as unknown as Parameters<typeof service.listClasses>[0]);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.createClass(req.body, requireUser(req));
  sendSuccess(res, 201, result);
});
