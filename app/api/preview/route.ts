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

    // For now, return a simple preview URL
    // In a full implementation, this would bundle the component and serve it
    const previewId = Math.random().toString(36).substring(7);

    // Create a simple HTML preview
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Component Preview</title>
    <style>
        body { 
            margin: 0; 
            padding: 16px; 
            font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
            background: ${theme === 'dark' ? '#0a0e13' : '#fafafa'};
            color: ${theme === 'dark' ? '#ffffff' : '#000000'};
        }
        .preview-container {
            background: ${theme === 'dark' ? '#1e1e1e' : '#ffffff'};
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, ${theme === 'dark' ? '0.3' : '0.1'});
        }
        .error {
            color: #f44336;
            background: #ffebee;
            padding: 16px;
            border-radius: 4px;
            border-left: 4px solid #f44336;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <h3>Component Preview</h3>
        <p><strong>Theme:</strong> ${theme}</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 4px; font-family: monospace; font-size: 14px; white-space: pre-wrap; overflow-x: auto;">
${code}
        </div>
        <p><em>Note: This is a simplified preview. In the full implementation, the component would be bundled and rendered with React.</em></p>
    </div>
</body>
</html>`;

    // In a real implementation, you'd store this HTML and serve it from a unique URL
    // For now, we'll return a data URL
    const dataUrl = `data:text/html;base64,${Buffer.from(html).toString('base64')}`;

    const response: API.PreviewResponse = {
      previewUrl: dataUrl,
      bundleSize: html.length,
      loadTime: 100, // Mock load time
      accessibility: {
        score: 85,
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
