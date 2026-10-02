import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './messages.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listMessages(
    req.query as unknown as Parameters<typeof service.listMessages>[0],
    requester,
  );
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const send = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const message = await service.sendMessage(req.body, requester);
  sendSuccess(res, 201, message);
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const message = await service.markRead(req.params.id, requester);
  sendSuccess(res, 200, message);
});
