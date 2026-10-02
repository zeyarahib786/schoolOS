import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './announcements.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listAnnouncements(
    req.query as unknown as Parameters<typeof service.listAnnouncements>[0],
    requester,
  );
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const announcement = await service.publish(req.body, requester);
  sendSuccess(res, 201, announcement);
});

export const changeStatus = asyncHandler(async (req: Request, res: Response) => {
  const announcement = await service.changeStatus(req.params.id, req.body, requireUser(req));
  sendSuccess(res, 200, announcement);
});
