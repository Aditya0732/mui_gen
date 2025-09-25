import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiErrorResponse, HttpStatus } from '@/types/api';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string;
  standardHeaders?: boolean; // Return rate limit info in headers
  legacyHeaders?: boolean; // Return legacy headers
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextApiRequest) => string;
}

interface RateLimitStore {
  [key: string]: {
    totalRequests: number;
    resetTime: number;
  };
}

// In-memory store (for production, use Redis or similar)
const store: RateLimitStore = {};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000); // Clean every minute

export function rateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  config: RateLimitConfig
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const {
      windowMs,
      max,
      message = 'Too many requests, please try again later.',
      standardHeaders = true,
      legacyHeaders = false,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = defaultKeyGenerator,
    } = config;

    const key = keyGenerator(req);
    const now = Date.now();
    const resetTime = now + windowMs;

    // Initialize or get existing record
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        totalRequests: 0,
        resetTime,
      };
    }

    const record = store[key];
    record.totalRequests++;

    const isRateLimited = record.totalRequests > max;
    const remaining = Math.max(0, max - record.totalRequests);
    const msUntilReset = record.resetTime - now;

    // Set headers
    if (standardHeaders) {
      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', remaining);
      res.setHeader('RateLimit-Reset', new Date(record.resetTime).toISOString());
    }

    if (legacyHeaders) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
    }

    if (isRateLimited) {
      res.setHeader('Retry-After', Math.ceil(msUntilReset / 1000));
      
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          details: {
            limit: max,
            windowMs,
            retryAfter: Math.ceil(msUntilReset / 1000),
          },
        },
        timestamp: new Date().toISOString(),
      };

      return res.status(HttpStatus.TOO_MANY_REQUESTS).json(errorResponse);
    }

    // Execute the handler
    try {
      await handler(req, res);

      // If we should skip successful requests, decrement the counter
      if (skipSuccessfulRequests && res.statusCode < 400) {
        record.totalRequests--;
      }
    } catch (error) {
      // If we should skip failed requests, decrement the counter
      if (skipFailedRequests && res.statusCode >= 400) {
        record.totalRequests--;
      }
      throw error;
    }
  };
}

function defaultKeyGenerator(req: NextApiRequest): string {
  // Use IP address as default key
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' 
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || 'unknown';
  
  return `rate_limit:${ip}`;
}

// Utility function for custom rate limiting
export function createRateLimiter(config: RateLimitConfig) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) =>
    rateLimit(handler, config);
}

// Predefined rate limiters
export const strictRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
});

export const moderateRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
});

export const lenientRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
});

// Rate limiter for authenticated users
export function createAuthenticatedRateLimit(config: RateLimitConfig) {
  return createRateLimiter({
    ...config,
    keyGenerator: (req: NextApiRequest) => {
      // Use user ID if authenticated, otherwise fall back to IP
      const userId = (req as any).user?.id;
      if (userId) {
        return `rate_limit:user:${userId}`;
      }
      return defaultKeyGenerator(req);
    },
  });
}

// Different limits for different endpoints
export const generationRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '30'),
  message: 'Too many generation requests. Please wait before generating more components.',
});

export const previewRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // More lenient for preview requests
  message: 'Too many preview requests. Please wait before previewing more components.',
});

export const exportRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Moderate limit for exports
  message: 'Too many export requests. Please wait before exporting more components.',
});
