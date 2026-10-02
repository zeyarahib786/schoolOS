import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './helpdesk.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const result = await service.listTickets(
    req.query as unknown as Parameters<typeof service.listTickets>[0],
    requester,
  );
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const raise = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const ticket = await service.raiseTicket(req.body, requester);
  sendSuccess(res, 201, ticket);
});

export const transition = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const ticket = await service.transitionTicket(req.params.id, req.body, requester);
  sendSuccess(res, 200, ticket);
});
