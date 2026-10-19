import { recordedInsights } from './reports.insights';
import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './reports.service';

export const overview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const data = await service.overview(req.user.role);
  sendSuccess(res, 200, data);
});

export const insights = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, 200, await recordedInsights());
});
