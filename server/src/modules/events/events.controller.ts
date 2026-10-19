import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { listEventsSchema } from './events.validation';
import * as service from './events.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listEvents(listEventsSchema.shape.query.parse(req.query), requireUser(req));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const event = await service.createEvent(req.body, requester);
  sendSuccess(res, 201, event);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.updateEvent(req.params.id, req.body, requireUser(req)));
});
export const cancel = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.cancelEvent(req.params.id, req.body, requireUser(req)));
});
