import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { listExamsSchema, listResultsSchema } from './exams.validation';
import * as service from './exams.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const listExams = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listExams(listExamsSchema.shape.query.parse(req.query));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const createExam = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const exam = await service.createExam(req.body, requester);
  sendSuccess(res, 201, exam);
});

export const addSubject = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const exam = await service.addSubject(req.params.id, req.body.subject, requester);
  sendSuccess(res, 200, exam);
});

export const removeSubject = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const exam = await service.removeSubject(req.params.id, req.params.subject, requester);
  sendSuccess(res, 200, exam);
});

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await service.getExamSummary(req.params.id);
  sendSuccess(res, 200, summary);
});

export const listResults = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listResults(listResultsSchema.shape.query.parse(req.query), requester);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const recordResult = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.recordResult(req.body, requester);
  sendSuccess(res, 201, result);
});

export const publishExam = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.publishExam(req.params.id, true, requireUser(req));
  sendSuccess(res, 200, result);
});

export const reopenExam = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.publishExam(req.params.id, false, requireUser(req));
  sendSuccess(res, 200, result);
});

export const notifyGuardian = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.notifyGuardian(req.params.id, req.params.studentId, requireUser(req));
  sendSuccess(res, 200, result);
});

export const generateReportCards = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.generateReportCards(req.params.id, req.body, requireUser(req));
  sendSuccess(res, 200, result);
});

export const update = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 200, await service.updateExam(req.params.id, req.body, requireUser(req))),
);
export const register = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 200, await service.saveExamRegister(req.params.id, req.body, requireUser(req))),
);
