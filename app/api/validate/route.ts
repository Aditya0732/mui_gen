import { NextRequest, NextResponse } from 'next/server';
import { CodeValidator } from '@/lib/infrastructure/validation/CodeValidator';
import { API, HttpStatus } from '@/types/api';

const codeValidator = new CodeValidator();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = API.ValidateRequest.safeParse(body);
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

    const { code, componentType, options } = validationResult.data;

    // Run all validations in parallel
    const [
      tsValidation,
      safetyValidation,
      importsValidation,
      reactValidation,
      accessibilityValidation
    ] = await Promise.all([
      codeValidator.validateTypeScript(code),
      options?.security !== false ? codeValidator.validateSafety(code) : Promise.resolve({ isValid: true, violations: [] }),
      codeValidator.validateImports(code),
      codeValidator.validateReactComponent(code),
      options?.accessibility !== false ? codeValidator.validateAccessibility(code) : Promise.resolve({ isValid: true, warnings: [] })
    ]);

    // Combine all errors and warnings
    const errors: API.ValidateResponse['errors'] = [];
    const warnings: API.ValidateResponse['warnings'] = [];

    // TypeScript errors
    if (!tsValidation.isValid) {
      errors.push(...tsValidation.errors.map(err => ({
        type: 'syntax' as const,
        message: err.message,
        line: err.line,
        column: err.column,
        severity: 'error' as const,
      })));
    }

    // Safety violations
    if (!safetyValidation.isValid) {
      errors.push(...safetyValidation.violations.map(violation => ({
        type: 'security' as const,
        message: violation.message,
        severity: violation.severity,
      })));
    }

    // Import violations
    if (!importsValidation.isValid) {
      errors.push({
        type: 'import' as const,
        message: `Forbidden imports: ${importsValidation.forbiddenImports.join(', ')}`,
        severity: 'error' as const,
      });
    }

    // React component issues
    if (!reactValidation.isValid) {
      errors.push(...reactValidation.issues.map(issue => ({
        type: 'type' as const,
        message: issue,
        severity: 'error' as const,
      })));
    }

    // Accessibility warnings
    if (accessibilityValidation.warnings.length > 0) {
      warnings.push(...accessibilityValidation.warnings.map(warning => ({
        type: 'accessibility' as const,
        message: warning,
      })));
    }

    const isValid = errors.filter(e => e.severity === 'error').length === 0;

    const response: API.ValidateResponse = {
      isValid,
      errors,
      warnings,
      accessibility: options?.accessibility !== false ? {
        score: Math.max(0, 100 - (errors.filter(e => e.type === 'accessibility').length * 20) - (warnings.length * 5)),
        issues: [...errors.filter(e => e.type === 'accessibility'), ...warnings.filter(w => w.type === 'accessibility')],
      } : undefined,
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
    console.error('Validation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Code validation failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    );
  }
}
