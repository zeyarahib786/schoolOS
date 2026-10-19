import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { listVisitorsSchema } from './visitors.validation';
import * as service from './visitors.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listVisitors(listVisitorsSchema.shape.query.parse(req.query), requester);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const visitor = await service.checkInVisitor(req.body, requester);
  sendSuccess(res, 201, visitor);
});

export const checkOut = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const visitor = await service.checkOutVisitor(req.params.id, requester, req.body);
  sendSuccess(res, 200, visitor);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.updateVisitor(req.params.id, req.body, requireUser(req)));
});
