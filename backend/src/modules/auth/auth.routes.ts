import { Router } from 'express';
import { authRateLimiter } from '../../middleware/index.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import * as authController from './auth.controller.js';

const router = Router();

// Apply stricter rate limiting to auth routes
router.use(authRateLimiter);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user and tenant (store)
 * @access  Public
 * @body    {
 *            email: string,
 *            password: string,
 *            name?: string,
 *            storeName: string,
 *            shopifyDomain: string,
 *            shopifyAccessToken: string,
 *            shopifyApiKey?: string,
 *            shopifyApiSecret?: string
 *          }
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 * @body    { email: string, password: string }
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @body    { refreshToken: string }
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route   PATCH /api/auth/me
 * @desc    Update current user profile
 * @access  Private
 * @body    { name?: string, email?: string }
 */
router.patch('/me', authenticate, authController.updateMe);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 * @body    { currentPassword: string, newPassword: string }
 */
router.post('/change-password', authenticate, authController.changePassword);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify if token is valid
 * @access  Private
 */
router.get('/verify', authenticate, authController.verifyToken);

export default router;
