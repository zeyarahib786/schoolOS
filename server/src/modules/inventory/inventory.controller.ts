import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './inventory.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const item = await service.addItem(req.body, requester);
  sendSuccess(res, 201, item);
});

export const listItems = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listItems(req.query as unknown as Parameters<typeof service.listItems>[0]);
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const item = await service.adjustStock(req.params.id, req.body, requireUser(req));
  sendSuccess(res, 200, item);
});

export const listPOs = asyncHandler(async (_req: Request, res: Response) => {
  const pos = await service.listPOs();
  sendSuccess(res, 200, pos);
});

export const createPO = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const po = await service.createPO(req.body, requester);
  sendSuccess(res, 201, po);
});

export const sendPO = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const po = await service.sendPO(req.params.id, requester);
  sendSuccess(res, 200, po);
});

export const receivePO = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const po = await service.receivePO(req.params.id, requester);
  sendSuccess(res, 200, po);
});

export const cancelPO = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const po = await service.cancelPO(req.params.id, requester);
  sendSuccess(res, 200, po);
});
