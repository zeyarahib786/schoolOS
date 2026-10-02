import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/apiResponse';
import * as service from './guardians.service';

function user(req: Request) { if (!req.user) throw ApiError.unauthorized(); return req.user; }
export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listGuardians(req.query as never);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});
export const portal = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await service.setPortalStatus(req.params.id, req.body.status, user(req))));
export const broadcasts = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listBroadcasts(req.query as never);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});
export const broadcast = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 201, await service.sendBroadcast(req.body, user(req))));
export const messages = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await service.listMessages(req.params.id)));
export const message = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 201, await service.sendMessage(req.params.id, req.body.text, user(req))));

