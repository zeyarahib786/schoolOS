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
  const result = await service.listCards(listCardsSchema.shape.query.parse(req.query), requireUser(req));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const issue = asyncHandler(async (req: Request, res: Response) => {
  const card = await service.issueCard(req.body, requireUser(req));
  sendSuccess(res, 201, card);
});

export const reportLost = asyncHandler(async (req: Request, res: Response) => {
  const card = await service.reportLost(req.params.id, requireUser(req), req.body);
  sendSuccess(res, 200, card);
});

export const revoke = asyncHandler(async (req: Request, res: Response) => {
  const card = await service.revoke(req.params.id, requireUser(req), req.body);
  sendSuccess(res, 200, card);
});

export const pdf = asyncHandler(async (req: Request, res: Response) => {
  const bytes = await service.cardPdf(req.params.id, requireUser(req));
  res
    .set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="id-card-record.pdf"',
      'Cache-Control': 'private, no-store',
    })
    .send(bytes);
});
