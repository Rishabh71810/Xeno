import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env.js';
import { 
  errorHandler, 
  notFoundHandler, 
  apiRateLimiter 
} from './middleware/index.js';
import { logger } from './utils/logger.js';

// Import routes (will be added in later phases)
import authRoutes from './modules/auth/auth.routes.js';
import tenantRoutes from './modules/tenant/tenant.routes.js';
import customerRoutes from './modules/customers/customer.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import productRoutes from './modules/products/product.routes.js';
import insightsRoutes from './modules/insights/insights.routes.js';
import ingestionRoutes from './modules/ingestion/ingestion.routes.js';
import webhookRoutes from './modules/shopify/webhooks/webhook.routes.js';

// Create Express application
const app: Express = express();

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim());
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// ===========================================
// BODY PARSING & COMPRESSION
// ===========================================

// Compression
app.use(compression());

// Body parsing - JSON (limit 10mb for potential large payloads)
app.use(express.json({ limit: '10mb' }));

// Body parsing - URL encoded
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================================
// RATE LIMITING
// ===========================================

// Apply rate limiting to all API routes
app.use(`${env.API_PREFIX}`, apiRateLimiter);

// ===========================================
// REQUEST LOGGING
// ===========================================

app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'debug';
    
    logger[logLevel](
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`,
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        tenantId: req.user?.tenantId,
      }
    );
  });
  
  next();
});

// ===========================================
// HEALTH CHECK
// ===========================================

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    },
  });
});

app.get(`${env.API_PREFIX}/health`, (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    data: {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

// ===========================================
// API ROUTES
// ===========================================

// Webhook routes (must be before JSON parsing for raw body access)
// These are handled specially - see webhookRoutes

// Auth routes
app.use(`${env.API_PREFIX}/auth`, authRoutes);

// Tenant management routes
app.use(`${env.API_PREFIX}/tenants`, tenantRoutes);

// Data routes (protected)
app.use(`${env.API_PREFIX}/customers`, customerRoutes);
app.use(`${env.API_PREFIX}/orders`, orderRoutes);
app.use(`${env.API_PREFIX}/products`, productRoutes);

// Insights/Analytics routes
app.use(`${env.API_PREFIX}/insights`, insightsRoutes);

// Ingestion routes
app.use(`${env.API_PREFIX}/ingestion`, ingestionRoutes);

// Webhook routes
app.use(`${env.API_PREFIX}/webhooks`, webhookRoutes);

// ===========================================
// ERROR HANDLING
// ===========================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;

