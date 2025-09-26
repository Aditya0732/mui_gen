import { NextRequest, NextResponse } from 'next/server';
import { API, HttpStatus } from '@/types/api';
import { ComponentApplicationService } from '@/lib/application/services/ComponentApplicationService';
import { PrismaComponentRepository } from '@/lib/infrastructure/repositories/PrismaComponentRepository';
import { PrismaGenerationJobRepository } from '@/lib/infrastructure/repositories/PrismaGenerationJobRepository';
import { ComponentGenerationService } from '@/lib/domain/services/ComponentGenerationService';
import { GeminiProvider } from '@/lib/infrastructure/llm/GeminiProvider';
import { CodeValidator } from '@/lib/infrastructure/validation/CodeValidator';
import { TemplateEngine } from '@/lib/core/templates/TemplateEngine';
import { PrismaClient } from '@prisma/client';
import { IGenerationJobRepository } from '@/lib/domain/repositories/IGenerationJobRepository';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const componentId = params.id;

    if (!componentId) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Component ID is required' },
          timestamp: new Date().toISOString(),
        },
        { status: HttpStatus.BAD_REQUEST }
      );
    }

    // Initialize services
    const componentRepository = new PrismaComponentRepository(prisma);
    const jobRepository = new PrismaGenerationJobRepository(
      prisma
    ) as unknown as IGenerationJobRepository;
    const llmProvider = new GeminiProvider(
      process.env.GEMINI_API_KEY!,
      process.env.GEMINI_MODEL || 'gemini-1.5-flash'
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

    // Get the component
    const component = await applicationService.getComponentById(componentId);

    if (!component) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Component not found' },
          timestamp: new Date().toISOString(),
        },
        { status: HttpStatus.NOT_FOUND }
      );
    }

    // Return the component data
    const response: API.ComponentResponse = {
      success: true,
      data: {
        component: {
          id: component.id,
          name: component.name,
          type: component.type,
          code: component.code,
          propsSchema: component.propsSchema,
          description: component.description,
          examples: component.examples,
          createdAt: component.createdAt.toISOString(),
          updatedAt: component.updatedAt.toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: HttpStatus.OK });
  } catch (error) {
    console.error('Get component error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    );
  }
}
