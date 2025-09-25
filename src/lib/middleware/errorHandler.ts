import type { NextApiResponse } from 'next';
import { ApiError, ApiErrorCode, ApiErrorResponse, HttpStatus } from '@/types/api';

export function handleApiError(
  error: unknown,
  res: NextApiResponse<ApiErrorResponse>
): void {
  console.error('API Error:', error);

  // Handle known ApiError instances
  if (error instanceof ApiError) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Handle validation errors (Zod)
  if (error && typeof error === 'object' && 'issues' in error) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: error,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(HttpStatus.BAD_REQUEST).json(errorResponse);
    return;
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any;
    
    switch (prismaError.code) {
      case 'P2002':
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'A record with this value already exists',
            details: {
              constraint: prismaError.meta?.target,
            },
          },
          timestamp: new Date().toISOString(),
        };

        res.status(HttpStatus.CONFLICT).json(errorResponse);
        return;

      case 'P2025':
        const notFoundResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: ApiErrorCode.NOT_FOUND,
            message: 'Record not found',
          },
          timestamp: new Date().toISOString(),
        };

        res.status(HttpStatus.NOT_FOUND).json(notFoundResponse);
        return;

      case 'P2003':
        const foreignKeyResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Foreign key constraint failed',
            details: {
              field: prismaError.meta?.field_name,
            },
          },
          timestamp: new Date().toISOString(),
        };

        res.status(HttpStatus.BAD_REQUEST).json(foreignKeyResponse);
        return;
    }
  }

  // Handle timeout errors
  if (error instanceof Error && error.message.includes('timeout')) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'TIMEOUT_ERROR',
        message: 'Request timed out',
      },
      timestamp: new Date().toISOString(),
    };

    res.status(HttpStatus.SERVICE_UNAVAILABLE).json(errorResponse);
    return;
  }

  // Handle rate limit errors (if not already handled by middleware)
  if (error instanceof Error && error.message.includes('rate limit')) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
      },
      timestamp: new Date().toISOString(),
    };

    res.status(HttpStatus.TOO_MANY_REQUESTS).json(errorResponse);
    return;
  }

  // Generic error handler
  const genericErrorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code: ApiErrorCode.INTERNAL_ERROR,
      message: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : 'Unknown error')
        : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && error instanceof Error && {
        stack: error.stack,
      }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(genericErrorResponse);
}

// Error boundary for async route handlers
export function withErrorHandler<T = any>(
  handler: (req: any, res: NextApiResponse<T>) => Promise<void>
) {
  return async (req: any, res: NextApiResponse<T>) => {
    try {
      await handler(req, res);
    } catch (error) {
      handleApiError(error, res as NextApiResponse<ApiErrorResponse>);
    }
  };
}

// Specific error creators for common scenarios
export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(ApiErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST, details);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    super(ApiErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(ApiErrorCode.AUTHENTICATION_ERROR, message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(ApiErrorCode.AUTHORIZATION_ERROR, message, HttpStatus.FORBIDDEN);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(ApiErrorCode.VALIDATION_ERROR, message, HttpStatus.CONFLICT, details);
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super(
      ApiErrorCode.RATE_LIMIT_EXCEEDED, 
      'Rate limit exceeded', 
      HttpStatus.TOO_MANY_REQUESTS,
      { retryAfter }
    );
  }
}

export class LLMError extends ApiError {
  constructor(message: string, details?: any) {
    super(ApiErrorCode.LLM_ERROR, message, HttpStatus.SERVICE_UNAVAILABLE, details);
  }
}

export class CompilationError extends ApiError {
  constructor(errors: string[], details?: any) {
    super(
      ApiErrorCode.COMPILATION_ERROR, 
      `Compilation failed: ${errors.join(', ')}`, 
      HttpStatus.UNPROCESSABLE_ENTITY,
      { errors, ...details }
    );
  }
}

export class TemplateError extends ApiError {
  constructor(message: string, template?: string) {
    super(
      ApiErrorCode.TEMPLATE_ERROR, 
      message, 
      HttpStatus.INTERNAL_SERVER_ERROR,
      { template }
    );
  }
}

export class PreviewError extends ApiError {
  constructor(message: string, details?: any) {
    super(
      ApiErrorCode.PREVIEW_ERROR, 
      message, 
      HttpStatus.UNPROCESSABLE_ENTITY,
      details
    );
  }
}

// Logging utilities
export function logError(error: unknown, context?: string): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}] ` : '';
  
  if (error instanceof Error) {
    console.error(`${timestamp} ${contextStr}Error: ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
  } else {
    console.error(`${timestamp} ${contextStr}Unknown error:`, error);
  }
}

export function logWarning(message: string, context?: string): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}] ` : '';
  console.warn(`${timestamp} ${contextStr}Warning: ${message}`);
}

export function logInfo(message: string, context?: string): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}] ` : '';
  console.log(`${timestamp} ${contextStr}Info: ${message}`);
}
