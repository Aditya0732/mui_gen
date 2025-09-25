import { z } from 'zod';
import { ComponentType, ComponentCandidate } from './component';

// Generation Request
export const GenerationRequest = z.object({
  prompt: z.string().min(1).max(2000),
  preferredType: z.nativeEnum(ComponentType).optional(),
  context: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('light'),
    accessibility: z.boolean().default(true),
    responsive: z.boolean().default(true),
    typescript: z.boolean().default(true),
  }).optional(),
  options: z.object({
    includeExamples: z.boolean().default(true),
    includeComments: z.boolean().default(true),
    maxComplexity: z.enum(['simple', 'medium', 'complex']).default('medium'),
    allowCustomComponents: z.boolean().default(false),
  }).optional(),
});

export type GenerationRequest = z.infer<typeof GenerationRequest>;

// Generation Response
export const GenerationResponse = z.object({
  success: z.boolean(),
  component: z.object({
    componentType: z.nativeEnum(ComponentType),
    componentName: z.string(),
    code: z.string(),
    propsSchema: z.any(), // Will be validated separately
    description: z.string().optional(),
    examples: z.array(z.string()).optional(),
    variants: z.array(z.string()).optional(),
  }).optional(),
  candidates: z.array(ComponentCandidate).optional(),
  metadata: z.object({
    processingTime: z.number(),
    tokensUsed: z.number().optional(),
    confidence: z.number().min(0).max(1),
    intentMatch: z.number().min(0).max(1),
    complexity: z.enum(['simple', 'medium', 'complex']),
  }),
  error: z.object({
    type: z.enum(['validation', 'generation', 'parsing', 'timeout', 'rate_limit']),
    message: z.string(),
    details: z.any().optional(),
    recovery: z.object({
      suggestions: z.array(z.string()),
      fallbackComponent: z.string().optional(),
    }).optional(),
  }).optional(),
});

export type GenerationResponse = z.infer<typeof GenerationResponse>;

// LLM Provider Interface
export interface LLMProvider {
  name: string;
  model: string;
  generateComponent(request: GenerationRequest): Promise<GenerationResponse>;
  validateApiKey(): Promise<boolean>;
  getUsageStats(): Promise<LLMUsageStats>;
}

export interface LLMUsageStats {
  totalRequests: number;
  totalTokens: number;
  averageResponseTime: number;
  successRate: number;
  rateLimitHits: number;
}

// Generation Status
export enum GenerationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
}

// Generation Job
export interface GenerationJob {
  id: string;
  request: GenerationRequest;
  status: GenerationStatus;
  result?: GenerationResponse;
  error?: Error;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

// Generation Metrics
export interface GenerationMetrics {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  averageProcessingTime: number;
  popularComponentTypes: Array<{
    type: ComponentType;
    count: number;
    percentage: number;
  }>;
  errorBreakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  intentMatchingAccuracy: number;
  userSatisfactionScore?: number;
}

// Prompt Analysis
export interface PromptAnalysis {
  intent: {
    componentType: ComponentType[];
    confidence: number;
    reasoning: string;
  };
  entities: Array<{
    type: 'property' | 'value' | 'action' | 'style';
    value: string;
    confidence: number;
  }>;
  complexity: 'simple' | 'medium' | 'complex';
  requirements: {
    accessibility: boolean;
    responsive: boolean;
    interactive: boolean;
    dataBinding: boolean;
  };
  suggestions: string[];
}

// Template Injection Context
export interface TemplateContext {
  componentName: string;
  componentType: ComponentType;
  props: Record<string, any>;
  imports: string[];
  interfaces: string[];
  constants: Record<string, any>;
  methods: string[];
  styles: Record<string, any>;
  examples: string[];
}

// Code Generation Options
export interface CodeGenerationOptions {
  typescript: boolean;
  includeComments: boolean;
  includeExamples: boolean;
  includePropTypes: boolean;
  useArrowFunctions: boolean;
  useMemoization: boolean;
  includeErrorBoundary: boolean;
  accessibilityLevel: 'basic' | 'enhanced' | 'strict';
  formatting: {
    semicolons: boolean;
    singleQuotes: boolean;
    trailingComma: boolean;
    printWidth: number;
  };
}
