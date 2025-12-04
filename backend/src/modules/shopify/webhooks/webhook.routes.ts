import { Router, Request, Response } from 'express';
import { captureRawBody, verifyShopifyWebhook, webhookRateLimit } from '../../../middleware/index.js';
import { logger } from '../../../utils/logger.js';
import * as webhookService from './webhook.service.js';

const router = Router();

// Helper to get tenant ID from request
const getTenantId = (req: Request): string | null => {
  return req.tenant?.id || null;
};

// Generic webhook response handler
const handleWebhook = async <T>(
  req: Request,
  res: Response,
  handler: (tenantId: string, payload: T) => Promise<void>
): Promise<Response> => {
  const tenantId = getTenantId(req);
  const topic = req.headers['x-shopify-topic'] as string;

  if (!tenantId) {
    logger.error('Webhook received without tenant ID');
    return res.status(400).json({ error: 'Tenant not found' });
  }

  // Acknowledge receipt immediately (Shopify expects 200 within 5 seconds)
  res.status(200).json({ received: true });

  // Process webhook asynchronously
  try {
    await handler(tenantId, req.body);
    logger.info(`Webhook processed: ${topic} for tenant ${tenantId}`);
  } catch (error) {
    logger.error(`Webhook processing failed: ${topic}`, error);
  }

  return res;
};

// ==================== SHOPIFY WEBHOOK ROUTES ====================

// Apply middleware to all Shopify webhook routes
router.use('/shopify', captureRawBody);
router.use('/shopify', verifyShopifyWebhook);
router.use('/shopify', webhookRateLimit);

// ==================== CUSTOMER WEBHOOKS ====================

/**
 * @route   POST /api/webhooks/shopify/customers/create
 * @desc    Handle customer create webhook from Shopify
 * @access  Shopify (HMAC verified)
 */
router.post('/shopify/customers/create', async (req: Request, res: Response) => {
  return handleWebhook(req, res, webhookService.handleCustomerCreate);
});

/**
 * @route   POST /api/webhooks/shopify/customers/update
 * @desc    Handle customer update webhook from Shopify
 * @access  Shopify (HMAC verified)
 */
router.post('/shopify/customers/update', async (req: Request, res: Response) => {
  return handleWebhook(req, res, webhookService.handleCustomerUpdate);
});

/**
 * @route   POST /api/webhooks/shopify/customers/delete
 * @desc    Handle customer delete webhook from Shopify
 * @access  Shopify (HMAC verified)
 */
router.post('/shopify/customers/delete', async (req: Request, res: Response) => {
  return handleWebhook(req, res, webhookService.handleCustomerDelete);
});

// ==================== PRODUCT WEBHOOKS ====================

/**
 * @route   POST /api/webhooks/shopify/products/create
 * @desc    Handle product create webhook from Shopify
 * @access  Shopify (HMAC verified)
 */
router.post('/shopify/products/create', async (req: Request, res: Response) => {
  return handleWebhook(req, res, webhookService.handleProductCreate);
});

/**
 * @route   POST /api/webhooks/shopify/products/update
 * @desc    Handle product update webhook from Shopify
 * @access  Shopify (HMAC verified)
 */
router.post('/shopify/products/update', async (req: Request, res: Response) => {
  return handleWebhook(req, res, webhookService.handleProductUpdate);
});

/**
 * @route   POST /api/webhooks/shopify/products/delete
 * @desc    Handle product delete webhook from Shopify
 * @access  Shopify (HMAC verified)
 */
router.post('/shopify/products/delete', async (req: Request, res: Response) => {
  return handleWebhook(req, res, webhookService.handleProductDelete);
});

// ==================== ORDER WEBHOOKS ====================

/**
 * @route   POST /api/webhooks/shopify/orders/create
 * @desc    Handle order create webhook from Shopify
 * @access  Shopify (HMAC verified)
 */
router.post('/shopify/orders/create', async (req: Request, res: Response) => {
  return handleWebhook(req, res, webhookService.handleOrderCreate);
});

/**
 * @route   POST /api/webhooks/shopify/orders/updated
 * @desc    Handle order update webhook from Shopify
 * @access  Shopify (HMAC verified)
 */
router.post('/shopify/orders/updated', async (req: Request, res: Response) => {
  return handleWebhook(req, res, webhookService.handleOrderUpdate);
});

/**
 * @route   POST /api/webhooks/shopify/orders/cancelled
 * @desc    Handle order cancelled webhook from Shopify
 * @access  Shopify (HMAC verified)
 */
router.post('/shopify/orders/cancelled', async (req: Request, res: Response) => {
  return handleWebhook(req, res, webhookService.handleOrderCancelled);
});

// ==================== CHECKOUT WEBHOOKS (Abandoned Cart) ====================

/**
 * @route   POST /api/webhooks/shopify/checkouts/create
 * @desc    Handle checkout create webhook from Shopify
 * @access  Shopify (HMAC verified)
 */
router.post('/shopify/checkouts/create', async (req: Request, res: Response) => {
  return handleWebhook(req, res, webhookService.handleCheckoutCreate);
});

/**
 * @route   POST /api/webhooks/shopify/checkouts/update
 * @desc    Handle checkout update webhook from Shopify
 * @access  Shopify (HMAC verified)
 */
router.post('/shopify/checkouts/update', async (req: Request, res: Response) => {
  return handleWebhook(req, res, webhookService.handleCheckoutUpdate);
});

// ==================== CATCH-ALL ====================

/**
 * @route   POST /api/webhooks/shopify/:resource/:action
 * @desc    Catch-all for any other Shopify webhooks
 * @access  Shopify (HMAC verified)
 */
router.post('/shopify/:resource/:action', (req: Request, res: Response) => {
  const { resource, action } = req.params;
  const topic = `${resource}/${action}`;
  
  logger.info(`Received unhandled webhook: ${topic}`, {
    tenantId: req.tenant?.id,
    topic,
  });

  // Still acknowledge receipt
  return res.status(200).json({ received: true, message: 'Webhook received but not processed' });
});

export default router;
