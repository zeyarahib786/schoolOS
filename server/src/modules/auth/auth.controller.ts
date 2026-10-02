import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import * as authService from './auth.service';
import { logout as logoutService } from './auth.service';
import { ApiError } from '../../utils/ApiError';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  sendSuccess(res, 201, { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  sendSuccess(res, 200, { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refresh(req.body.refreshToken);
  sendSuccess(res, 200, result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await logoutService(req.user.id);
  sendSuccess(res, 200, { message: 'Logged out - all outstanding refresh tokens revoked' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await authService.getCurrentUser(req.user.id);
  sendSuccess(res, 200, { user });
});
