import { z } from 'zod';

// Base API Response
export const BaseApiResponse = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().optional(),
});

export type BaseApiResponse = z.infer<typeof BaseApiResponse>;

// API Error Response
export const ApiErrorResponse = BaseApiResponse.extend({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    stack: z.string().optional(),
  }),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>;

// API Success Response
export const ApiSuccessResponse = <T extends z.ZodType>(dataSchema: T) =>
  BaseApiResponse.extend({
    success: z.literal(true),
    data: dataSchema,
  });

// Pagination
export const PaginationParams = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationParams = z.infer<typeof PaginationParams>;

export const PaginationMeta = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export type PaginationMeta = z.infer<typeof PaginationMeta>;

export const PaginatedResponse = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    meta: PaginationMeta,
  });

// Rate Limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// API Route Handlers
export type ApiHandler<T = any> = (
  req: NextApiRequest,
  res: NextApiResponse<T>
) => Promise<void> | void;

// API Error Types
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  LLM_ERROR = 'LLM_ERROR',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
  TEMPLATE_ERROR = 'TEMPLATE_ERROR',
  PREVIEW_ERROR = 'PREVIEW_ERROR',
}

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Request/Response Types for specific endpoints
export namespace API {
  // Generate Component
  export const GenerateRequest = z.object({
    prompt: z.string().min(1).max(2000),
    preferredType: z.string().optional(),
    options: z
      .object({
        theme: z.enum(['light', 'dark']).default('light'),
        typescript: z.boolean().default(true),
        accessibility: z.boolean().default(true),
      })
      .optional(),
  });

  export type GenerateRequest = z.infer<typeof GenerateRequest>;

  export const GenerateResponse = z.object({
    jobId: z.string(),
    component: z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      code: z.string(),
      propsSchema: z.any(),
      examples: z.array(z.string()).optional(),
    }),
    candidates: z
      .array(
        z.object({
          type: z.string(),
          score: z.number(),
          reason: z.string(),
        })
      )
      .optional(),
    metadata: z.object({
      processingTime: z.number(),
      intentMatch: z.number(),
      confidence: z.number(),
    }),
  });

  export type GenerateResponse = z.infer<typeof GenerateResponse>;

  // Validate Component
  export const ValidateRequest = z.object({
    code: z.string(),
    componentType: z.string(),
    options: z
      .object({
        typescript: z.boolean().default(true),
        accessibility: z.boolean().default(true),
        security: z.boolean().default(true),
      })
      .optional(),
  });

  export type ValidateRequest = z.infer<typeof ValidateRequest>;

  export const ValidateResponse = z.object({
    isValid: z.boolean(),
    errors: z.array(
      z.object({
        type: z.string(),
        message: z.string(),
        line: z.number().optional(),
        column: z.number().optional(),
        severity: z.enum(['error', 'warning', 'info']),
      })
    ),
    warnings: z.array(
      z.object({
        type: z.string(),
        message: z.string(),
        line: z.number().optional(),
      })
    ),
    accessibility: z
      .object({
        score: z.number(),
        issues: z.array(z.any()),
      })
      .optional(),
  });

  export type ValidateResponse = z.infer<typeof ValidateResponse>;

  // Preview Component
  export const PreviewRequest = z.object({
    code: z.string(),
    theme: z.enum(['light', 'dark']).default('light'),
    props: z.record(z.any()).optional(),
  });

  export type PreviewRequest = z.infer<typeof PreviewRequest>;

  export const PreviewResponse = z.object({
    previewUrl: z.string(),
    bundleSize: z.number(),
    loadTime: z.number(),
    accessibility: z
      .object({
        score: z.number(),
        violations: z.array(z.any()),
      })
      .optional(),
  });

  export type PreviewResponse = z.infer<typeof PreviewResponse>;

  // Save Component
  export const SaveRequest = z.object({
    name: z.string().min(1).max(100),
    code: z.string(),
    type: z.string(),
    propsSchema: z.any(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    examples: z.array(z.string()).optional(),
  });

  export type SaveRequest = z.infer<typeof SaveRequest>;

  export const SaveResponse = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
  });

  export type SaveResponse = z.infer<typeof SaveResponse>;

  // Library Operations
  export const LibraryListRequest = PaginationParams.extend({
    search: z.string().optional(),
    type: z.string().optional(),
    tags: z.array(z.string()).optional(),
  });

  export type LibraryListRequest = z.infer<typeof LibraryListRequest>;

  export const LibraryComponent = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    usageCount: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  });

  export type LibraryComponent = z.infer<typeof LibraryComponent>;

  export const LibraryListResponse = PaginatedResponse(LibraryComponent);
  export type LibraryListResponse = z.infer<typeof LibraryListResponse>;

  // Individual Component Response
  export const ComponentResponse = z.object({
    success: z.literal(true),
    data: z.object({
      component: z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        code: z.string(),
        propsSchema: z.any(),
        description: z.string().optional(),
        examples: z.array(z.string()).optional(),
        createdAt: z.string(),
        updatedAt: z.string(),
      }),
    }),
    timestamp: z.string(),
  });

  export type ComponentResponse = z.infer<typeof ComponentResponse>;
}

// HTTP Status Codes
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// NextJS API types
import type { NextApiRequest, NextApiResponse } from 'next';
