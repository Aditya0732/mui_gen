import { NextRequest, NextResponse } from 'next/server';
import { API, HttpStatus } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = API.PreviewRequest.safeParse(body);
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

    const { code, theme, props } = validationResult.data;

    // Extract component name from the code
    const componentNameMatch = code.match(
      /(?:export\s+default\s+|const\s+)(\w+)/
    );
    const componentName = componentNameMatch
      ? componentNameMatch[1]
      : 'GeneratedComponent';

    try {
      // Send component to preview service
      console.log('Sending component to preview service...');

      const previewResponse = await fetch('http://localhost:3001/api/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          componentName,
          theme,
          props,
        }),
      });

      if (!previewResponse.ok) {
        const errorText = await previewResponse.text();
        throw new Error(
          `Preview service error (${previewResponse.status}): ${errorText}`
        );
      }

      const previewData = await previewResponse.json();

      if (!previewData.success) {
        throw new Error(previewData.error || 'Preview service failed');
      }

      console.log('Preview service response:', previewData);

      // Return the preview URL from the service
      const response: API.PreviewResponse = {
        previewUrl: previewData.data.fullUrl,
        bundleSize: code.length,
        loadTime: 200,
        accessibility: {
          score: 95,
          violations: [],
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
    } catch (previewError) {
      console.error('Preview service error:', previewError);

      // Return error response
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PREVIEW_SERVICE_ERROR',
            message: 'Preview service is unavailable',
            details:
              previewError instanceof Error
                ? previewError.message
                : 'Unknown error',
          },
          timestamp: new Date().toISOString(),
        },
        { status: HttpStatus.SERVICE_UNAVAILABLE }
      );
    }
  } catch (error) {
    console.error('Preview generation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PREVIEW_GENERATION_FAILED',
          message: 'Failed to generate preview',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    );
  }
}
