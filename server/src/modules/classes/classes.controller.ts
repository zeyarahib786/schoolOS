import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/apiResponse';
import { listClassesSchema } from './classes.validation';
import * as service from './classes.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listClasses(listClassesSchema.shape.query.parse(req.query));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.createClass(req.body, requireUser(req));
  sendSuccess(res, 201, result);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.updateClass(req.params.id, req.body, requireUser(req)));
});
