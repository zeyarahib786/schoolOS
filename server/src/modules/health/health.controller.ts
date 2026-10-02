import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './health.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listVisits(req.query as unknown as Parameters<typeof service.listVisits>[0], requester);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const visit = await service.recordVisit(req.body, requester);
  sendSuccess(res, 201, visit);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.updateVisit(req.params.id, req.body, requireUser(req)));
});
