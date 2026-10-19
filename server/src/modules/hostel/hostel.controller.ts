import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './hostel.service';
import { listRoomsSchema, listHostelLeaveSchema, listHostelMaintenanceSchema } from './hostel.validation';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const addRoom = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const room = await service.addRoom(req.body, requester);
  sendSuccess(res, 201, room);
});

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listRooms(listRoomsSchema.shape.query.parse(req.query), requester);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const allocate = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const room = await service.allocateRoom(req.params.id, req.body.studentId, requester, req.body.bedLabel);
  sendSuccess(res, 200, room);
});

export const listLeave = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listHostelLeave(listHostelLeaveSchema.shape.query.parse(req.query), requireUser(req));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const createLeave = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 201, await service.createHostelLeave(req.body, requireUser(req)));
});

export const transitionLeave = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.transitionHostelLeave(req.params.id, req.body, requireUser(req)));
});

export const listRollCall = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.listRollCall(String(req.query.date), requireUser(req)));
});

export const markRollCall = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.markRollCall(req.body, requireUser(req)));
});

export const markAllRollCall = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.markAllRollCall(req.body.date, requireUser(req)));
});

export const listMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listMaintenance(
    listHostelMaintenanceSchema.shape.query.parse(req.query),
    requireUser(req),
  );
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const createMaintenance = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 201, await service.createMaintenance(req.body, requireUser(req)));
});

export const resolveMaintenance = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.resolveMaintenance(req.params.id, requireUser(req), req.body));
});

export const reviewRoom = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 200, await service.reviewRoom(req.params.id, req.body, requireUser(req))),
);
export const discharge = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 200, await service.discharge(req.params.id, req.body, requireUser(req))),
);
