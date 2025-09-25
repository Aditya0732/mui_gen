import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ApiErrorResponse, HttpStatus } from '@/types/api';

export function validateRequest<T extends z.ZodType>(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  schema?: T
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Validate request body if schema provided
      if (schema && req.method !== 'GET') {
        const validationResult = schema.safeParse(req.body);
        
        if (!validationResult.success) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: validationResult.error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            },
            timestamp: new Date().toISOString(),
          };

          return res.status(HttpStatus.BAD_REQUEST).json(errorResponse);
        }

        // Attach validated data to request
        (req as any).validatedBody = validationResult.data;
      }

      // Validate query parameters for GET requests
      if (req.method === 'GET' && schema) {
        const validationResult = schema.safeParse(req.query);
        
        if (!validationResult.success) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid query parameters',
              details: validationResult.error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            },
            timestamp: new Date().toISOString(),
          };

          return res.status(HttpStatus.BAD_REQUEST).json(errorResponse);
        }

        (req as any).validatedQuery = validationResult.data;
      }

      // Execute the handler
      await handler(req, res);
    } catch (error) {
      console.error('Request validation error:', error);
      
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error during validation',
        },
        timestamp: new Date().toISOString(),
      };

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  };
}

// Common validation schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const IdParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const SearchSchema = z.object({
  query: z.string().min(1).max(200).optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).merge(PaginationSchema);

// Validation middleware factories
export function validateBody<T extends z.ZodType>(schema: T) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) =>
    validateRequest(handler, schema);
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) =>
    validateRequest(handler, schema);
}

// Method validation
export function allowMethods(methods: string[]) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) =>
    (req: NextApiRequest, res: NextApiResponse) => {
      if (!methods.includes(req.method || '')) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method} not allowed. Allowed methods: ${methods.join(', ')}`,
          },
          timestamp: new Date().toISOString(),
        };

        res.setHeader('Allow', methods.join(', '));
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse);
      }

      return handler(req, res);
    };
}

// Content-Type validation
export function requireContentType(contentType: string) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) =>
    (req: NextApiRequest, res: NextApiResponse) => {
      const requestContentType = req.headers['content-type'];
      
      if (!requestContentType || !requestContentType.includes(contentType)) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: `Content-Type must be ${contentType}`,
          },
          timestamp: new Date().toISOString(),
        };

        return res.status(HttpStatus.BAD_REQUEST).json(errorResponse);
      }

      return handler(req, res);
    };
}

// Request size validation
export function validateRequestSize(maxSizeBytes: number) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) =>
    (req: NextApiRequest, res: NextApiResponse) => {
      const contentLength = req.headers['content-length'];
      
      if (contentLength && parseInt(contentLength) > maxSizeBytes) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: `Request size exceeds maximum allowed size of ${maxSizeBytes} bytes`,
          },
          timestamp: new Date().toISOString(),
        };

        return res.status(HttpStatus.BAD_REQUEST).json(errorResponse);
      }

      return handler(req, res);
    };
}

// Combine multiple middleware
export function combineMiddleware(
  ...middlewares: Array<(handler: any) => any>
) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) =>
    middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
}

// Common middleware combinations
export const jsonApiMiddleware = combineMiddleware(
  requireContentType('application/json'),
  validateRequestSize(1024 * 1024) // 1MB max
);

export const paginatedGetMiddleware = combineMiddleware(
  allowMethods(['GET']),
  validateQuery(PaginationSchema)
);

export const idParamMiddleware = combineMiddleware(
  validateQuery(IdParamSchema)
);
