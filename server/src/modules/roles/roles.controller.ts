import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/apiResponse';
import * as service from './roles.service';
import { AccessModule } from './roles.constants';

function user(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (_req: Request, res: Response) =>
  sendSuccess(res, 200, await service.listRoles()),
);
export const mine = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 200, await service.myAccess(user(req))),
);
export const create = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 201, await service.createRole(req.body, user(req))),
);
export const updatePermission = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(
    res,
    200,
    await service.updatePermission(req.params.id, req.params.module as AccessModule, req.body, user(req)),
  ),
);
