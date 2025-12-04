import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';
import { 
  sendSuccess, 
  sendCreated, 
  sendNoContent,
  sendBadRequest 
} from '../../utils/apiResponse.js';
import * as authService from './auth.service.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './auth.validation.js';

/**
 * Register a new user and tenant
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  // Validate input
  const validatedData = registerSchema.parse(req.body);

  // Register user
  const result = await authService.register(validatedData);

  return sendCreated(res, result, 'Registration successful');
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  // Validate input
  const validatedData = loginSchema.parse(req.body);

  // Login user
  const result = await authService.login(validatedData);

  return sendSuccess(res, result, 'Login successful');
});

/**
 * Logout user
 * POST /api/auth/logout
 * Note: With JWT, logout is typically handled client-side by removing the token
 * This endpoint can be used to invalidate refresh tokens in a more robust implementation
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  // In a production system, you might want to:
  // 1. Add the token to a blacklist
  // 2. Invalidate refresh tokens in the database
  // For now, we just acknowledge the logout

  return sendSuccess(res, null, 'Logout successful');
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  // Validate input
  const validatedData = refreshTokenSchema.parse(req.body);

  // Refresh tokens
  const tokens = await authService.refreshAccessToken(validatedData.refreshToken);

  return sendSuccess(res, tokens, 'Token refreshed successfully');
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const user = await authService.getCurrentUser(req.user.id);

  return sendSuccess(res, user);
});

/**
 * Update current user profile
 * PATCH /api/auth/me
 */
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  // Validate input
  const validatedData = updateProfileSchema.parse(req.body);

  // Update profile
  const user = await authService.updateProfile(req.user.id, validatedData);

  return sendSuccess(res, user, 'Profile updated successfully');
});

/**
 * Change password
 * POST /api/auth/change-password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  // Validate input
  const validatedData = changePasswordSchema.parse(req.body);

  // Change password
  await authService.changePassword(req.user.id, validatedData);

  return sendSuccess(res, null, 'Password changed successfully');
});

/**
 * Verify token (useful for frontend to check if token is still valid)
 * GET /api/auth/verify
 */
export const verifyToken = asyncHandler(async (req: Request, res: Response) => {
  // If we reach here, the token is valid (middleware already verified it)
  return sendSuccess(res, {
    valid: true,
    user: req.user,
    tenant: req.tenant,
  });
});

