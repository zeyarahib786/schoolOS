import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './surveys.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listSurveys(req.query as unknown as Parameters<typeof service.listSurveys>[0]);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const survey = await service.createSurvey(req.body, requester);
  sendSuccess(res, 201, survey);
});

export const activate = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const survey = await service.activateSurvey(req.params.id, requester);
  sendSuccess(res, 200, survey);
});

export const close = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const survey = await service.closeSurvey(req.params.id, requester);
  sendSuccess(res, 200, survey);
});

export const respond = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const response = await service.submitResponse(req.params.id, req.body, requester);
  sendSuccess(res, 201, response);
});

export const results = asyncHandler(async (req: Request, res: Response) => {
  const summary = await service.getResults(req.params.id);
  sendSuccess(res, 200, summary);
});
