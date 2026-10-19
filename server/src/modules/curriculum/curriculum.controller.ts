import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './curriculum.service';
import { listUnitsSchema } from './curriculum.validation';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listUnits(listUnitsSchema.shape.query.parse(req.query), requireUser(req));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const subjects = asyncHandler(async (_req: Request, res: Response) => {
  const list = await service.listSubjects();
  sendSuccess(res, 200, list);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const unit = await service.createUnit(req.body, requester);
  sendSuccess(res, 201, unit);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const unit = await service.updateUnit(req.params.id, req.body, requester);
  sendSuccess(res, 200, unit);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  await service.deleteUnit(req.params.id, requester);
  sendSuccess(res, 200, { message: 'Curriculum unit removed' });
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.archiveUnit(req.params.id, req.body, requireUser(req)));
});
