import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
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
  const result = await service.listBookings(req.query as unknown as Parameters<typeof service.listBookings>[0]);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const booking = await service.createBooking(req.body, requester);
  sendSuccess(res, 201, booking);
});
