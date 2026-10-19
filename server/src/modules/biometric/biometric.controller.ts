import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './biometric.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const devices = await service.listDevices();
  sendSuccess(res, 200, devices);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const device = await service.addDevice(req.body, requester.role);
  sendSuccess(res, 201, device);
});

export const sync = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const device = await service.syncDevice(req.params.id, requester.role);
  sendSuccess(res, 200, device);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.updateDevice(req.params.id, req.body, requireUser(req)));
});
