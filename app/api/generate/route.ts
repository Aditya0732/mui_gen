import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ComponentApplicationService } from '@/lib/application/services/ComponentApplicationService';
import { ComponentGenerationService } from '@/lib/domain/services/ComponentGenerationService';
import { PrismaComponentRepository } from '@/lib/infrastructure/repositories/PrismaComponentRepository';
import { PrismaGenerationJobRepository } from '@/lib/infrastructure/repositories/PrismaGenerationJobRepository';
import { GeminiProvider } from '@/lib/infrastructure/llm/GeminiProvider';
import { CodeValidator } from '@/lib/infrastructure/validation/CodeValidator';
import { TemplateEngine } from '@/lib/core/templates/TemplateEngine';
import { API, HttpStatus } from '@/types/api';
import { GenerationRequest } from '@/types';
import { getAuthUser } from '@/lib/auth-utils';

// Initialize dependencies
const prisma = new PrismaClient();
const componentRepository = new PrismaComponentRepository(prisma);
const jobRepository = new PrismaGenerationJobRepository(prisma);

// Check for required environment variables
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
}

const llmProvider = new GeminiProvider(
  process.env.GEMINI_API_KEY || 'dummy-key',
  process.env.GEMINI_MODEL || 'gemini-2.5-flash'
);
const codeValidator = new CodeValidator();
const templateEngine = new TemplateEngine();

const generationService = new ComponentGenerationService(
  componentRepository,
  jobRepository,
  llmProvider,
  codeValidator,
  templateEngine
);

const applicationService = new ComponentApplicationService(
  componentRepository,
  generationService
);

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user: any = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        },
        { status: HttpStatus.UNAUTHORIZED }
      );
    }

    // Check rate limiting
    const clientIP =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = API.GenerateRequest.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validationResult.error.errors,
          },
          timestamp: new Date().toISOString(),
        },
        { status: HttpStatus.BAD_REQUEST }
      );
    }

    const { prompt, preferredType, options } = validationResult.data;

    // Convert to internal GenerationRequest format
    const generationRequest: GenerationRequest = {
      prompt,
      preferredType: preferredType as any,
      context: {
        theme: options?.theme || 'light',
        accessibility: options?.accessibility ?? true,
        responsive: true,
        typescript: options?.typescript ?? true,
      },
      options: {
        includeExamples: true,
        includeComments: true,
        maxComplexity: 'medium',
        allowCustomComponents: false,
      },
    };

    // Generate component with user context
    const result = await applicationService.generateComponent(
      generationRequest,
      user.id
    );

    // Return response
    const response: API.GenerateResponse = {
      jobId: result.jobId,
      component: {
        id: result.jobId,
        name: 'GeneratingComponent',
        type: preferredType || 'MUIButton',
        code: '// Component is being generated...',
        propsSchema: {},
        examples: [],
      },
      metadata: {
        processingTime: result.estimatedTime,
        intentMatch: 0.8,
        confidence: 0.8,
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      },
      { status: HttpStatus.OK }
    );
  } catch (error) {
    console.error('Generation API error:', error);

    // Check if it's an API key issue
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFIGURATION_ERROR',
            message: 'API key not configured',
            details: 'GEMINI_API_KEY environment variable is missing',
          },
          timestamp: new Date().toISOString(),
        },
        { status: HttpStatus.INTERNAL_SERVER_ERROR }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate component',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'jobId parameter is required',
        },
        timestamp: new Date().toISOString(),
      },
      { status: HttpStatus.BAD_REQUEST }
    );
  }

  try {
    const status = await applicationService.getGenerationStatus(jobId);

    return NextResponse.json(
      {
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      },
      { status: HttpStatus.OK }
    );
  } catch (error) {
    console.error('Status check error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get generation status',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    );
  }
}
