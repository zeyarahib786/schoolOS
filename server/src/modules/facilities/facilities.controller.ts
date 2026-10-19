import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { listBookingsSchema } from './facilities.validation';
import * as service from './facilities.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const listFacilities = asyncHandler(async (_req: Request, res: Response) => {
  const facilities = await service.listFacilities();
  sendSuccess(res, 200, facilities);
});

export const addFacility = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const facility = await service.addFacility(req.body, requester);
  sendSuccess(res, 201, facility);
});

export const listBookings = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listBookings(listBookingsSchema.shape.query.parse(req.query));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const booking = await service.createBooking(req.body, requester);
  sendSuccess(res, 201, booking);
});

export const review = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.reviewFacility(req.params.id, req.body, requireUser(req)));
});
export const cancel = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.cancelBooking(req.params.id, req.body, requireUser(req)));
});
