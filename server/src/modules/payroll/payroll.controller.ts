import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './payroll.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listPayslips(
    req.query as unknown as Parameters<typeof service.listPayslips>[0],
    requester,
  );
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const payslip = await service.generatePayslip(req.body, requester);
  sendSuccess(res, 201, payslip);
});

export const markPaid = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const payslip = await service.markPayslipPaid(req.params.id, requester);
  sendSuccess(res, 200, payslip);
});
