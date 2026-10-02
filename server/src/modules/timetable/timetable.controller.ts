import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './timetable.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const slots = await service.listSlots(
    req.query as unknown as Parameters<typeof service.listSlots>[0],
    requireUser(req),
  );
  sendSuccess(res, 200, slots);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const slot = await service.addSlot(req.body, requester);
  sendSuccess(res, 201, slot);
});
export const update = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.updateSlot(req.params.id, req.body, requireUser(req)));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.removeSlot(req.params.id, requireUser(req));
  res.status(204).send();
});

export const publish = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.publishGrade(req.body.grade, requireUser(req)));
});

export const swap = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.swapSlots(req.body, requireUser(req)));
});
