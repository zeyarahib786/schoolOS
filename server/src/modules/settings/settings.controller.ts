import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './settings.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const get = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await service.getSettings();
  sendSuccess(res, 200, settings);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const settings = await service.updateSettings(req.body, requester);
  sendSuccess(res, 200, settings);
});
