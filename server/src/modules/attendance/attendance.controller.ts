import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { listAttendanceSchema, listStaffAttendanceSchema, listAbsenceRequestsSchema } from './attendance.validation';
import * as service from './attendance.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listAttendance(listAttendanceSchema.shape.query.parse(req.query), requester);
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
  const result = await service.listStaffAttendance(listStaffAttendanceSchema.shape.query.parse(req.query), requester);
  sendSuccess(res, 200, result.items, { date: result.date });
});

export const markStaff = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.markStaffAttendance(req.body, requester);
  sendSuccess(res, 200, result);
});

export const listAbsenceRequests = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listAbsenceRequests(listAbsenceRequestsSchema.shape.query.parse(req.query), requester);
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

export const register = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.saveCheckedRegister(req.body, requireUser(req)));
});
