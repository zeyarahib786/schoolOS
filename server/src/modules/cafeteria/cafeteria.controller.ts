import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { listWalletsSchema, listTransactionsSchema, listAllergyPlansSchema } from './cafeteria.validation';
import * as service from './cafeteria.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const listWallets = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listWallets(listWalletsSchema.shape.query.parse(req.query), requester);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const topUp = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const wallet = await service.topUp(req.body, requester);
  sendSuccess(res, 200, wallet);
});

export const purchase = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const wallet = await service.purchase(req.body, requester);
  sendSuccess(res, 200, wallet);
});

export const listTransactions = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listTransactions(listTransactionsSchema.shape.query.parse(req.query), requireUser(req));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const listAllergyPlans = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listAllergyPlans(listAllergyPlansSchema.shape.query.parse(req.query), requireUser(req));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const saveAllergyPlan = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.saveAllergyPlan(req.body, requireUser(req)));
});

export const listMenu = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, 200, await service.listMenu());
});

export const saveMenuItem = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.saveMenuItem(req.body, requireUser(req)));
});
