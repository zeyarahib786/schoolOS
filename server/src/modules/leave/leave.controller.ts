import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './leave.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listLeave(req.query as unknown as Parameters<typeof service.listLeave>[0], requester);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const request = await service.requestLeave(req.body, requester);
  sendSuccess(res, 201, request);
});

export const decide = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const request = await service.decideLeave(req.params.id, req.body, requester);
  sendSuccess(res, 200, request);
});
