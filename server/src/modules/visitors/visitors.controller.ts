import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './visitors.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listVisitors(
    req.query as unknown as Parameters<typeof service.listVisitors>[0],
    requester,
  );
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const visitor = await service.checkInVisitor(req.body, requester);
  sendSuccess(res, 201, visitor);
});

export const checkOut = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const visitor = await service.checkOutVisitor(req.params.id, requester);
  sendSuccess(res, 200, visitor);
});
