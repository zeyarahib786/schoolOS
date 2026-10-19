import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/apiResponse';
import { listGuardiansSchema, listBroadcastsSchema } from './guardians.validation';
import * as service from './guardians.service';

function user(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}
export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listGuardians(listGuardiansSchema.shape.query.parse(req.query), user(req));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});
export const portal = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 200, await service.setPortalStatus(req.params.id, req.body.status, user(req))),
);
export const broadcasts = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listBroadcasts(listBroadcastsSchema.shape.query.parse(req.query));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});
export const broadcast = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 201, await service.sendBroadcast(req.body, user(req))),
);
export const messages = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 200, await service.listMessages(req.params.id, user(req))),
);
export const message = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 201, await service.sendMessage(req.params.id, req.body.text, user(req))),
);

export const get = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 200, await service.getGuardian(req.params.id, user(req))),
);
export const create = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 201, await service.saveGuardian(null, req.body, user(req))),
);
export const update = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(res, 200, await service.saveGuardian(req.params.id, req.body, user(req), req.body.expectedUpdatedAt)),
);
export const account = asyncHandler(async (req: Request, res: Response) =>
  sendSuccess(
    res,
    200,
    await service.linkGuardianAccount(req.params.id, req.body.parentEmail, req.body.expectedUpdatedAt, user(req)),
  ),
);
