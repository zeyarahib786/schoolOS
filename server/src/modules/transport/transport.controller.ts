import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './transport.service';
import { listRoutesSchema, listIncidentsSchema } from './transport.validation';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const addVehicle = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const vehicle = await service.addVehicle(req.body, requester);
  sendSuccess(res, 201, vehicle);
});

export const listVehicles = asyncHandler(async (req: Request, res: Response) => {
  const vehicles = await service.listVehicles(requireUser(req));
  sendSuccess(res, 200, vehicles);
});

export const addRoute = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const route = await service.addRoute(req.body, requester);
  sendSuccess(res, 201, route);
});

export const listRoutes = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listRoutes(listRoutesSchema.shape.query.parse(req.query), requester);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const assignStudent = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const route = await service.assignStudent(req.params.id, req.body.studentId, requester, req.body.stopName);
  sendSuccess(res, 200, route);
});

export const updateOperationalStatus = asyncHandler(async (req: Request, res: Response) => {
  const route = await service.setRouteOperationalStatus(req.params.id, req.body, requireUser(req));
  sendSuccess(res, 200, route);
});

export const scheduleMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await service.scheduleVehicleMaintenance(req.params.id, requireUser(req), req.body);
  sendSuccess(res, 200, vehicle);
});

export const createIncident = asyncHandler(async (req: Request, res: Response) => {
  const incident = await service.reportIncident(req.params.id, req.body, requireUser(req));
  sendSuccess(res, 201, incident);
});

export const listIncidents = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listIncidents(listIncidentsSchema.shape.query.parse(req.query), requireUser(req));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const reviewVehicle = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 200, await service.reviewVehicle(req.params.id, req.body, requireUser(req))),
);
export const reviewRoute = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 200, await service.reviewRoute(req.params.id, req.body, requireUser(req))),
);
export const removeStudent = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 200, await service.removeStudent(req.params.id, req.body, requireUser(req))),
);
export const reviewIncident = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 200, await service.reviewIncident(req.params.id, req.body, requireUser(req))),
);
