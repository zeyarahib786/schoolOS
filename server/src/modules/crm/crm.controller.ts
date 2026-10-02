import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/apiResponse';
import * as service from './crm.service';

function user(req: Request) { if (!req.user) throw ApiError.unauthorized(); return req.user; }
export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listLeads(req.query as never);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});
export const create = asyncHandler(async (req: Request, res: Response) => { sendSuccess(res, 201, await service.createLead(req.body, user(req))); });
export const advance = asyncHandler(async (req: Request, res: Response) => { sendSuccess(res, 200, await service.advanceLead(req.params.id, user(req))); });
export const schedule = asyncHandler(async (req: Request, res: Response) => { sendSuccess(res, 200, await service.scheduleFollowUp(req.params.id, req.body, user(req))); });
export const activity = asyncHandler(async (req: Request, res: Response) => { sendSuccess(res, 200, await service.logActivity(req.params.id, req.body, user(req))); });
export const archive = asyncHandler(async (req: Request, res: Response) => { sendSuccess(res, 200, await service.archiveLead(req.params.id, req.body, user(req))); });
export const restore = asyncHandler(async (req: Request, res: Response) => { sendSuccess(res, 200, await service.restoreLead(req.params.id, user(req))); });
export const convert = asyncHandler(async (req: Request, res: Response) => { sendSuccess(res, 201, await service.convertLead(req.params.id, user(req))); });
export const remove = asyncHandler(async (req: Request, res: Response) => { sendSuccess(res, 200, await service.deleteLead(req.params.id, user(req))); });
