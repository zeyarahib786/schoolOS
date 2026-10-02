import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './library.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const listBooks = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listBooks(req.query as unknown as Parameters<typeof service.listBooks>[0]);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const addBook = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const book = await service.addNewArrival(req.body, requester);
  sendSuccess(res, 201, book);
});

export const issue = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const loan = await service.issueLoan(req.body, requester);
  sendSuccess(res, 201, loan);
});

export const returnBook = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const loan = await service.returnLoan(req.params.id, requester);
  sendSuccess(res, 200, loan);
});

export const listLoans = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listLoans(req.query as unknown as Parameters<typeof service.listLoans>[0], requester);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const createRequest = asyncHandler(async (req: Request, res: Response) => {
  const bookRequest = await service.createBookRequest(req.body, requireUser(req));
  sendSuccess(res, 201, bookRequest);
});

export const listRequests = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listBookRequests(req.query as never, requireUser(req));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const fulfillRequest = asyncHandler(async (req: Request, res: Response) => {
  const bookRequest = await service.fulfillRequest(req.params.id, requireUser(req));
  sendSuccess(res, 200, bookRequest);
});

export const sendReminders = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.sendOverdueReminders(req.body, requireUser(req));
  sendSuccess(res, 200, result);
});
