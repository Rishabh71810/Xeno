import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { sendUnauthorized, sendForbidden } from '../utils/apiResponse.js';
import { JwtPayload } from '../types/index.js';
import { UserRole } from '@prisma/client';

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        isActive: true,
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
      return sendUnauthorized(res, 'User not found');
    }

    if (!user.isActive) {
      return sendUnauthorized(res, 'Account is deactivated');
    }

    if (!user.tenant.isActive) {
      return sendUnauthorized(res, 'Tenant account is deactivated');
    }

    // Attach user and tenant to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };

    req.tenant = {
      id: user.tenant.id,
      name: user.tenant.name,
      shopifyDomain: user.tenant.shopifyDomain,
      isActive: user.tenant.isActive,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return sendUnauthorized(res, 'Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return sendUnauthorized(res, 'Invalid token');
    }
    return sendUnauthorized(res, 'Authentication failed');
  }
};

/**
 * Check if user has required role(s)
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return sendUnauthorized(res, 'Not authenticated');
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return sendForbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        isActive: true,
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

    if (user && user.isActive && user.tenant.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      };

      req.tenant = {
        id: user.tenant.id,
        name: user.tenant.name,
        shopifyDomain: user.tenant.shopifyDomain,
        isActive: user.tenant.isActive,
      };
    }

    next();
  } catch {
    // Continue without authentication
    next();
  }
};

/**
 * Check if user belongs to a specific tenant
 */
export const checkTenantAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  const { tenantId } = req.params;

  if (!req.user) {
    return sendUnauthorized(res, 'Not authenticated');
  }

  // Admin can access any tenant (if you want to add super admin later)
  // For now, users can only access their own tenant
  if (req.user.tenantId !== tenantId) {
    return sendForbidden(res, 'Access denied to this tenant');
  }

  next();
};


