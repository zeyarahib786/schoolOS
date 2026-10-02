import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './lms.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const listAssignments = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listAssignments(req.query as unknown as Parameters<typeof service.listAssignments>[0]);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const createAssignment = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const assignment = await service.createAssignment(req.body, requester);
  sendSuccess(res, 201, assignment);
});

export const listSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const assignmentId = typeof req.query.assignmentId === 'string' ? req.query.assignmentId : undefined;
  const submissions = await service.listSubmissions(requester, assignmentId);
  sendSuccess(res, 200, submissions);
});

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const submission = await service.submitAssignment(req.params.id, req.body, requester);
  sendSuccess(res, 201, submission);
});

export const grade = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const submission = await service.gradeSubmission(req.params.id, req.body, requester);
  sendSuccess(res, 200, submission);
});
