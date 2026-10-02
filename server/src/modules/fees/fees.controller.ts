import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './fees.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listInvoices(
    req.query as unknown as Parameters<typeof service.listInvoices>[0],
    requester,
  );
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const invoice = await service.createInvoice(req.body, requester);
  sendSuccess(res, 201, invoice);
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const invoice = await service.recordPayment(req.params.id, req.body, requester);
  sendSuccess(res, 200, invoice);
});

export const recordStudentPayment = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const invoice = await service.recordStudentPayment(req.body, requester);
  sendSuccess(res, 200, invoice);
});

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listPayments(req.query as unknown as Parameters<typeof service.listPayments>[0], requester);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const sendReminders = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.sendFeeReminders(req.body, requester);
  sendSuccess(res, 200, result);
});
