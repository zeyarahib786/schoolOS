import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './attendance.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listAttendance(
    req.query as unknown as Parameters<typeof service.listAttendance>[0],
    requester,
  );
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const mark = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.markAttendance(req.body, requester);
  sendSuccess(res, 201, result);
});

export const save = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.saveRegister(req.body, requester);
  sendSuccess(res, 200, result);
});

export const listStaff = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listStaffAttendance(
    req.query as unknown as Parameters<typeof service.listStaffAttendance>[0],
    requester,
  );
  sendSuccess(res, 200, result.items, { date: result.date });
});

export const markStaff = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.markStaffAttendance(req.body, requester);
  sendSuccess(res, 200, result);
});

export const listAbsenceRequests = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listAbsenceRequests(
    req.query as unknown as Parameters<typeof service.listAbsenceRequests>[0],
    requester,
  );
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const createAbsenceRequest = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.createAbsenceRequest(req.body, requester);
  sendSuccess(res, 201, result);
});

export const cancelAbsenceRequest = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.cancelAbsenceRequest(req.params.id, requester);
  sendSuccess(res, 200, result);
});

export const decideAbsenceRequest = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.decideAbsenceRequest(req.params.id, req.body, requester);
  sendSuccess(res, 200, result);
});
