import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { encrypt } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';
import { 
  RegisterInput, 
  LoginInput, 
  ChangePasswordInput,
  UpdateProfileInput 
} from './auth.validation.js';
import { JwtPayload, RefreshTokenPayload } from '../../types/index.js';
import { 
  BadRequestError, 
  UnauthorizedError, 
  ConflictError,
  NotFoundError 
} from '../../middleware/errorHandler.middleware.js';

// Token expiration parsing
const parseExpiration = (exp: string): number => {
  const match = exp.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60; // Default 7 days

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'd': return value * 24 * 60 * 60;
    case 'h': return value * 60 * 60;
    case 'm': return value * 60;
    case 's': return value;
    default: return 7 * 24 * 60 * 60;
  }
};

// Generate access token
const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: parseExpiration(env.JWT_EXPIRES_IN),
  });
};

// Generate refresh token
const generateRefreshToken = (userId: string): string => {
  const payload: RefreshTokenPayload = { userId };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: parseExpiration(env.JWT_REFRESH_EXPIRES_IN),
  });
};

// Token response type
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// User response type (without sensitive data)
export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    shopifyDomain: string;
  };
  createdAt: Date;
}

// Auth response type
export interface AuthResponse {
  user: UserResponse;
  tokens: TokenResponse;
}

/**
 * Register a new user and tenant (store)
 */
export const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const {
    email,
    password,
    name,
    storeName,
    shopifyDomain,
    shopifyAccessToken,
    shopifyApiKey,
    shopifyApiSecret,
  } = input;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Check if tenant with this Shopify domain already exists
  const existingTenant = await prisma.tenant.findUnique({
    where: { shopifyDomain },
  });

  if (existingTenant) {
    throw new ConflictError('A store with this Shopify domain is already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Encrypt Shopify access token
  const encryptedToken = encrypt(shopifyAccessToken);

  // Create tenant and user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create tenant
    const tenant = await tx.tenant.create({
      data: {
        name: storeName,
        shopifyDomain,
        shopifyAccessToken: encryptedToken,
        shopifyApiKey: shopifyApiKey || null,
        shopifyApiSecret: shopifyApiSecret || null,
        isActive: true,
      },
    });

    // Create user as ADMIN of the tenant
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        role: 'ADMIN',
        tenantId: tenant.id,
        isActive: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            shopifyDomain: true,
          },
        },
      },
    });

    return { user, tenant };
  });

  logger.info(`New user registered: ${email} for store: ${storeName}`);

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: result.user.id,
    email: result.user.email,
    tenantId: result.user.tenantId,
    role: result.user.role,
  });

  const refreshToken = generateRefreshToken(result.user.id);

  // Prepare response
  const userResponse: UserResponse = {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role: result.user.role,
    tenantId: result.user.tenantId,
    tenant: result.user.tenant,
    createdAt: result.user.createdAt,
  };

  return {
    user: userResponse,
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: parseExpiration(env.JWT_EXPIRES_IN),
      tokenType: 'Bearer',
    },
  };
};

/**
 * Login user
 */
export const login = async (input: LoginInput): Promise<AuthResponse> => {
  const { email, password } = input;

  // Find user with tenant
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          shopifyDomain: true,
          isActive: true,
        },
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new UnauthorizedError('Your account has been deactivated');
  }

  // Check if tenant is active
  if (!user.tenant.isActive) {
    throw new UnauthorizedError('Your store account has been deactivated');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info(`User logged in: ${email}`);

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
  });

  const refreshToken = generateRefreshToken(user.id);

  // Prepare response
  const userResponse: UserResponse = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenant: {
      id: user.tenant.id,
      name: user.tenant.name,
      shopifyDomain: user.tenant.shopifyDomain,
    },
    createdAt: user.createdAt,
  };

  return {
    user: userResponse,
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: parseExpiration(env.JWT_EXPIRES_IN),
      tokenType: 'Bearer',
    },
  };
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<TokenResponse> => {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenant: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (!user.isActive || !user.tenant.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken(user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: parseExpiration(env.JWT_EXPIRES_IN),
      tokenType: 'Bearer',
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token expired. Please login again.');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (userId: string): Promise<UserResponse> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          shopifyDomain: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenant: user.tenant,
    createdAt: user.createdAt,
  };
};

/**
 * Update user profile
 */
export const updateProfile = async (
  userId: string,
  input: UpdateProfileInput
): Promise<UserResponse> => {
  const { name, email } = input;

  // Check if email is being changed and if it's already taken
  if (email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      throw new ConflictError('Email is already in use');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          shopifyDomain: true,
        },
      },
    },
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
    tenantId: updatedUser.tenantId,
    tenant: updatedUser.tenant,
    createdAt: updatedUser.createdAt,
  };
};

/**
 * Change password
 */
export const changePassword = async (
  userId: string,
  input: ChangePasswordInput
): Promise<void> => {
  const { currentPassword, newPassword } = input;

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isPasswordValid) {
    throw new BadRequestError('Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  logger.info(`Password changed for user: ${user.email}`);
};

/**
 * Add user to tenant (invite)
 */
export const addUserToTenant = async (
  tenantId: string,
  email: string,
  name: string | undefined,
  role: 'ADMIN' | 'MANAGER' | 'VIEWER',
  invitedBy: string
): Promise<UserResponse> => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Generate a temporary password (user should change it)
  const tempPassword = Math.random().toString(36).slice(-12);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name || null,
      role,
      tenantId,
      isActive: true,
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          shopifyDomain: true,
        },
      },
    },
  });

  logger.info(`User ${email} added to tenant ${tenantId} by ${invitedBy}`);

  // In production, you would send an email with the temp password
  // For now, we'll just return the user

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenant: user.tenant,
    createdAt: user.createdAt,
  };
};

