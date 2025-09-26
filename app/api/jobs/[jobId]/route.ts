import { NextRequest, NextResponse } from 'next/server';
import { ComponentApplicationService } from '@/lib/application/services/ComponentApplicationService';
import { PrismaComponentRepository } from '@/lib/infrastructure/repositories/PrismaComponentRepository';
import { PrismaGenerationJobRepository } from '@/lib/infrastructure/repositories/PrismaGenerationJobRepository';
import { ComponentGenerationService } from '@/lib/domain/services/ComponentGenerationService';
import { GeminiProvider } from '@/lib/infrastructure/llm/GeminiProvider';
import { CodeValidator } from '@/lib/infrastructure/validation/CodeValidator';
import { PrismaClient } from '@prisma/client';
import { TemplateEngine } from '@/lib/core/templates/TemplateEngine';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: { message: 'Job ID is required' } },
        { status: 400 }
      );
    }

    // Initialize repositories and services
    const componentRepository = new PrismaComponentRepository(prisma);
    const jobRepository = new PrismaGenerationJobRepository(prisma);
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

    // Get job status
    const job: any = await applicationService.getJobStatus(jobId);

    if (!job) {
      return NextResponse.json(
        { success: false, error: { message: 'Job not found' } },
        { status: 404 }
      );
    }

    // If job is completed successfully, get the component
    if (
      (job.status === 'SUCCESS' || job.status === 'COMPLETED') &&
      job.componentId
    ) {
      const component = await applicationService.getComponentById(
        job.componentId
      );

      return NextResponse.json({
        success: true,
        data: {
          job: {
            id: job.id,
            status: job.status,
            componentId: job.componentId,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            error: job.error,
          },
          component: component
            ? {
                id: component.id,
                name: component.name,
                type: component.type,
                code: component.code,
                propsSchema: component.propsSchema,
                description: component.description,
                examples: component.examples,
                createdAt: component.createdAt,
              }
            : null,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Return job status without component data
    return NextResponse.json({
      success: true,
      data: {
        job: {
          id: job.id,
          status: job.status,
          componentId: job.componentId,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          error: job.error,
        },
        component: null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in job status API:', error);
    return errorHandler(error);
  }
}
function errorHandler(error: unknown) {
  throw new Error('Function not implemented.');
}
