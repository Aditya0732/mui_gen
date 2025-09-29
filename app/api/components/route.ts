import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ComponentApplicationService } from '@/lib/application/services/ComponentApplicationService';
import { PrismaComponentRepository } from '@/lib/infrastructure/repositories/PrismaComponentRepository';
import { API, HttpStatus } from '@/types/api';
import { ComponentSearchOptions, ComponentType } from '@/types';
import { getAuthUser } from '@/lib/auth-utils';

const prisma = new PrismaClient();
const componentRepository = new PrismaComponentRepository(prisma);
const applicationService = new ComponentApplicationService(
  componentRepository,
  {} as any // Generation service placeholder
);

// GET /api/components - List components with search and pagination
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;

    const searchOptions = {
      query: searchParams.get('search') || undefined,
      types: searchParams.get('type')
        ? [searchParams.get('type') as ComponentType]
        : undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    // Add user filter to search options
    const userFilteredOptions = {
      ...searchOptions,
      userId: user?.id, // Filter by current user
    } as ComponentSearchOptions;

    const result =
      await applicationService.searchComponents(userFilteredOptions);

    const response: API.LibraryListResponse = {
      items: result.components.map(component => ({
        id: component.id,
        name: component.name,
        type: component.type,
        description: component.description,
        tags: component.tags,
        usageCount: component.usageCount,
        createdAt: component.createdAt.toISOString(),
        updatedAt: component.updatedAt.toISOString(),
      })),
      meta: {
        page:
          Math.floor(
            (searchOptions.offset || 0) / (searchOptions.limit || 20)
          ) + 1,
        limit: searchOptions.limit || 20,
        total: result.total,
        totalPages: Math.ceil(result.total / (searchOptions.limit || 20)),
        hasNextPage: result.hasMore,
        hasPrevPage: (searchOptions.offset || 0) > 0,
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
    console.error('Components list error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch components',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    );
  }
}

// POST /api/components - Create a new component
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = API.SaveRequest.safeParse(body);
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

    const { name, code, type, propsSchema, description, tags, examples } =
      validationResult.data;

    // Get user ID from session (if authenticated)
    // const userId = await getUserFromRequest(request);

    const component = await applicationService.createComponent({
      name,
      type: type as ComponentType,
      code,
      propsSchema,
      description,
      examples,
      tags,
    });

    const response: API.SaveResponse = {
      id: component.id,
      name: component.name,
      createdAt: component.createdAt.toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      },
      { status: HttpStatus.CREATED }
    );
  } catch (error) {
    console.error('Component creation error:', error);

    const statusCode =
      error instanceof Error && error.message.includes('already exists')
        ? HttpStatus.CONFLICT
        : HttpStatus.INTERNAL_SERVER_ERROR;

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'COMPONENT_CREATION_FAILED',
          message: 'Failed to create component',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}
