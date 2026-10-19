import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './behaviour.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listIncidents(
    req.query as unknown as Parameters<typeof service.listIncidents>[0],
    requester,
  );
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const incident = await service.logIncident(req.body, requester);
  sendSuccess(res, 201, incident);
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.updateIncidentStatus(req.params.id, req.body, requireUser(req)));
});
