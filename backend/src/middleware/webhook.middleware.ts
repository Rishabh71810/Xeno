import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sendUnauthorized, sendBadRequest } from '../utils/apiResponse.js';

/**
 * Capture raw body for webhook verification
 * Must be used before express.json() for webhook routes
 */
export const captureRawBody = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let data = '';
  
  req.on('data', (chunk: Buffer) => {
    data += chunk.toString();
  });

  req.on('end', () => {
    req.rawBody = data;
    
    // Parse JSON manually
    if (data && req.headers['content-type']?.includes('application/json')) {
      try {
        req.body = JSON.parse(data);
      } catch {
        req.body = {};
      }
    }
    
    next();
  });
};

/**
 * Verify Shopify webhook HMAC signature
 */
export const verifyShopifyWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
    const shopifyDomain = req.headers['x-shopify-shop-domain'] as string;
    const topic = req.headers['x-shopify-topic'] as string;

    if (!hmacHeader) {
      logger.warn('Webhook missing HMAC header');
      return sendUnauthorized(res, 'Missing HMAC header');
    }

    if (!shopifyDomain) {
      logger.warn('Webhook missing shop domain header');
      return sendBadRequest(res, 'Missing shop domain header');
    }

    if (!req.rawBody) {
      logger.warn('Webhook missing raw body');
      return sendBadRequest(res, 'Missing request body');
    }

    // Find tenant by Shopify domain
    const tenant = await prisma.tenant.findUnique({
      where: { shopifyDomain },
      select: {
        id: true,
        name: true,
        shopifyDomain: true,
        shopifyApiSecret: true,
        webhookSecret: true,
        isActive: true,
      },
    });

    if (!tenant) {
      logger.warn(`Webhook from unknown shop: ${shopifyDomain}`);
      return sendUnauthorized(res, 'Unknown shop');
    }

    if (!tenant.isActive) {
      logger.warn(`Webhook from inactive tenant: ${shopifyDomain}`);
      return sendUnauthorized(res, 'Tenant is inactive');
    }

    // Get the secret for verification
    const secret = tenant.webhookSecret || tenant.shopifyApiSecret;

    if (!secret) {
      logger.error(`No webhook secret configured for tenant: ${tenant.id}`);
      return sendUnauthorized(res, 'Webhook verification not configured');
    }

    // Verify HMAC
    const calculatedHmac = crypto
      .createHmac('sha256', secret)
      .update(req.rawBody, 'utf8')
      .digest('base64');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedHmac),
      Buffer.from(hmacHeader)
    );

    if (!isValid) {
      logger.warn(`Invalid webhook HMAC for shop: ${shopifyDomain}`);
      return sendUnauthorized(res, 'Invalid HMAC signature');
    }

    // Attach tenant and topic to request for downstream handlers
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      shopifyDomain: tenant.shopifyDomain,
      isActive: tenant.isActive,
    };

    // Store topic in request for later use
    (req as Request & { webhookTopic?: string }).webhookTopic = topic;

    logger.info(`Webhook verified: ${topic} from ${shopifyDomain}`);
    
    next();
  } catch (error) {
    logger.error('Webhook verification error:', error);
    return sendUnauthorized(res, 'Webhook verification failed');
  }
};

/**
 * Rate limiting for webhooks (per tenant)
 */
const webhookCounts = new Map<string, { count: number; resetAt: number }>();
const WEBHOOK_RATE_LIMIT = 100; // Max webhooks per window
const WEBHOOK_WINDOW_MS = 60000; // 1 minute window

export const webhookRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  if (!req.tenant) {
    return next();
  }

  const key = req.tenant.id;
  const now = Date.now();
  
  let record = webhookCounts.get(key);
  
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + WEBHOOK_WINDOW_MS };
    webhookCounts.set(key, record);
  }

  record.count++;

  if (record.count > WEBHOOK_RATE_LIMIT) {
    logger.warn(`Webhook rate limit exceeded for tenant: ${key}`);
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many webhooks. Please try again later.',
      },
    });
  }

  next();
};


