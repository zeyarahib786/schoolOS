import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import * as service from './idcards.service';
import { ApiError } from '../../utils/ApiError';
import { listCardsSchema } from './idcards.validation';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listCards(listCardsSchema.shape.query.parse(req.query));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const issue = asyncHandler(async (req: Request, res: Response) => {
  const card = await service.issueCard(req.body, requireUser(req));
  sendSuccess(res, 201, card);
});

export const reportLost = asyncHandler(async (req: Request, res: Response) => {
  const card = await service.reportLost(req.params.id, requireUser(req));
  sendSuccess(res, 200, card);
});

export const revoke = asyncHandler(async (req: Request, res: Response) => {
  const card = await service.revoke(req.params.id, requireUser(req));
  sendSuccess(res, 200, card);
});
