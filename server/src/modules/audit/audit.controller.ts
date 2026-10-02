import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { listAuditLog } from './audit.service';
import { logAudit } from './audit.service';
import { ApiError } from '../../utils/ApiError';
import { listAuditLogSchema } from './audit.validation';

/** This file exports exactly one handler, deliberately - there is no create/update/delete
 * controller function here for anything to accidentally get wired to a route later. */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = listAuditLogSchema.shape.query.parse(req.query);
  const result = await listAuditLog(query);
  sendSuccess(res, 200, result.items, { pagination: {
    page: query.page, limit: query.limit, total: result.total,
    totalPages: Math.ceil(result.total / query.limit),
  } });
});

export const recordExport = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await logAudit('Exported audit log', 'Audit', req.user.id, 'Warning');
  sendSuccess(res, 200, { recorded: true });
});
