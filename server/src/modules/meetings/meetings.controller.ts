import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { listSlotsSchema } from './meetings.validation';
import * as service from './meetings.service';
import * as staffService from './meetings.staff.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listSlots(listSlotsSchema.shape.query.parse(req.query), requireUser(req));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const slot = await service.publishSlot(req.body, requester);
  sendSuccess(res, 201, slot);
});

export const book = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const slot = await service.bookSlot(req.params.id, req.body, requester);
  sendSuccess(res, 200, slot);
});
export const staffBook = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await staffService.bookOnBehalf(req.params.id, req.body, requireUser(req)));
});
export const confirm = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await staffService.confirm(req.params.id, requireUser(req)));
});
export const cancel = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await staffService.cancel(req.params.id, requireUser(req)));
});
export const reschedule = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await staffService.reschedule(req.params.id, req.body.targetSlotId, requireUser(req)));
});
export const notify = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await staffService.notify(req.params.id, requireUser(req)));
});
