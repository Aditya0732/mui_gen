import * as ts from 'typescript';
import { Project } from 'ts-morph';
import { ICodeValidator } from '../../domain/services/ComponentGenerationService';

export class CodeValidator implements ICodeValidator {
  private project: Project;
  private allowedImports: Set<string>;
  private forbiddenPatterns: RegExp[];
  private forbiddenIdentifiers: Set<string>;

  constructor() {
    this.project = new Project({
      compilerOptions: {
        target: ts.ScriptTarget.ES2022 as any,
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: false,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        module: ts.ModuleKind.ESNext as any,
        moduleResolution: ts.ModuleResolutionKind.Node16,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });

    this.allowedImports = new Set([
      '@mui/material',
      '@mui/material/',
      '@mui/icons-material',
      '@mui/icons-material/',
      '@mui/x-data-grid',
      '@mui/x-data-grid/',
      'react',
      'react-hook-form',
      'react/',
    ]);

    this.forbiddenPatterns = [
      /dangerouslySetInnerHTML/i,
      /innerHTML/i,
      /outerHTML/i,
      /document\.cookie/i,
      /window\.location/i,
      /window\.open/i,
      /eval\s*\(/i,
      /new\s+Function/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
      /fetch\s*\(/i,
      /XMLHttpRequest/i,
      /WebSocket/i,
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers in JSX
    ];

    this.forbiddenIdentifiers = new Set([
      'eval',
      'Function',
      'setTimeout',
      'setInterval',
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'postMessage',
      'localStorage',
      'sessionStorage',
      'indexedDB',
    ]);
  }

  async validateTypeScript(code: string): Promise<{
    isValid: boolean;
    errors: Array<{
      message: string;
      line?: number;
      column?: number;
    }>;
  }> {
    try {
      // Create a temporary source file
      const sourceFile = this.project.createSourceFile('temp.tsx', code, {
        overwrite: true,
      });

      // Get diagnostics
      const diagnostics = sourceFile.getPreEmitDiagnostics();

      const errors = diagnostics.map(diagnostic => {
        const message = diagnostic.getMessageText();
        const start = diagnostic.getStart();

        let line: number | undefined;
        let column: number | undefined;

        if (start !== undefined) {
          const lineAndColumn = sourceFile.getLineAndColumnAtPos(start);
          line = lineAndColumn.line;
          column = lineAndColumn.column;
        }

        return {
          message:
            typeof message === 'string' ? message : message.getMessageText(),
          line,
          column,
        };
      });

      // Clean up
      this.project.removeSourceFile(sourceFile);

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            message: `TypeScript validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  async validateSafety(code: string): Promise<{
    isValid: boolean;
    violations: Array<{
      type: string;
      message: string;
      severity: 'error' | 'warning';
    }>;
  }> {
    const violations: Array<{
      type: string;
      message: string;
      severity: 'error' | 'warning';
    }> = [];

    // Check for forbidden patterns
    for (const pattern of this.forbiddenPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        violations.push({
          type: 'forbidden-pattern',
          message: `Forbidden pattern detected: ${matches[0]}`,
          severity: 'error',
        });
      }
    }

    // AST-based analysis for more sophisticated checks
    try {
      const sourceFile = this.project.createSourceFile(
        'safety-check.tsx',
        code,
        { overwrite: true }
      );

      // Check for forbidden identifiers
      sourceFile.forEachDescendant((node: any) => {
        if (ts.isIdentifier(node.compilerNode)) {
          const text = node.getText();
          if (this.forbiddenIdentifiers.has(text)) {
            violations.push({
              type: 'forbidden-identifier',
              message: `Forbidden identifier: ${text}`,
              severity: 'error',
            });
          }
        }

        // Check for dynamic property access that might be dangerous
        if (ts.isElementAccessExpression(node.compilerNode)) {
          const expression = node.getText();
          if (
            expression.includes('window[') ||
            expression.includes('document[')
          ) {
            violations.push({
              type: 'dynamic-access',
              message: `Potentially dangerous dynamic property access: ${expression}`,
              severity: 'warning',
            });
          }
        }

        // Check for eval-like constructs
        if (ts.isCallExpression(node.compilerNode)) {
          const callExpression = node.asKind(ts.SyntaxKind.CallExpression);
          if (callExpression) {
            const expression = callExpression.getExpression();
            if (ts.isIdentifier(expression.compilerNode)) {
              const functionName = expression.getText();
              if (['eval', 'Function'].includes(functionName)) {
                violations.push({
                  type: 'eval-construct',
                  message: `Dangerous eval-like construct: ${functionName}`,
                  severity: 'error',
                });
              }
            }
          }
        }
      });

      // Clean up
      this.project.removeSourceFile(sourceFile);
    } catch (error) {
      violations.push({
        type: 'ast-analysis-error',
        message: `AST analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'warning',
      });
    }

    return {
      isValid: violations.filter(v => v.severity === 'error').length === 0,
      violations,
    };
  }

  async validateImports(code: string): Promise<{
    isValid: boolean;
    forbiddenImports: string[];
  }> {
    const forbiddenImports: string[] = [];

    try {
      const sourceFile = this.project.createSourceFile(
        'import-check.tsx',
        code,
        { overwrite: true }
      );

      // Get all import declarations
      const importDeclarations = sourceFile.getImportDeclarations();

      for (const importDecl of importDeclarations) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();

        if (!this.isAllowedImport(moduleSpecifier)) {
          forbiddenImports.push(moduleSpecifier);
        }
      }

      // Check for dynamic imports
      sourceFile.forEachDescendant((node: any) => {
        if (ts.isCallExpression(node.compilerNode)) {
          const callExpression = node.asKind(ts.SyntaxKind.CallExpression);
          if (callExpression) {
            const expression = callExpression.getExpression();
            // Fix: Use ts.SyntaxKind.ImportKeyword to check for dynamic import
            if (expression.getKind() === ts.SyntaxKind.ImportKeyword) {
              const args = callExpression.getArguments();
              if (
                args.length > 0 &&
                args[0].getKind() === ts.SyntaxKind.StringLiteral
              ) {
                const moduleSpecifier = args[0].getLiteralValue();
                if (!this.isAllowedImport(moduleSpecifier)) {
                  forbiddenImports.push(moduleSpecifier);
                }
              }
            }
          }
        }
      });

      // Clean up
      this.project.removeSourceFile(sourceFile);
    } catch (error) {
      // Fallback to regex-based import detection
      const importRegex =
        /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
      let match;

      while ((match = importRegex.exec(code)) !== null) {
        const moduleSpecifier = match[1];
        if (!this.isAllowedImport(moduleSpecifier)) {
          forbiddenImports.push(moduleSpecifier);
        }
      }
    }

    return {
      isValid: forbiddenImports.length === 0,
      forbiddenImports: Array.from(new Set(forbiddenImports)),
    };
  }

  private isAllowedImport(moduleSpecifier: string): boolean {
    // Allow relative imports
    if (moduleSpecifier.startsWith('./') || moduleSpecifier.startsWith('../')) {
      return true;
    }

    // Check against allowed imports
    for (const allowed of this.allowedImports) {
      if (moduleSpecifier === allowed || moduleSpecifier.startsWith(allowed)) {
        return true;
      }
    }

    return false;
  }

  // Additional validation methods
  async validateReactComponent(code: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const sourceFile = this.project.createSourceFile(
        'react-check.tsx',
        code,
        { overwrite: true }
      );

      let hasDefaultExport = false;
      let hasReactImport = false;
      let componentName = '';

      // Check for React import
      const importDeclarations = sourceFile.getImportDeclarations();
      for (const importDecl of importDeclarations) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        if (moduleSpecifier === 'react') {
          hasReactImport = true;
          break;
        }
      }

      if (!hasReactImport) {
        issues.push('Missing React import');
      }

      // Check for default export
      const exportAssignments = sourceFile.getExportAssignments();
      const defaultExports = sourceFile
        .getExportedDeclarations()
        .get('default');

      if (
        exportAssignments.length === 0 &&
        (!defaultExports || defaultExports.length === 0)
      ) {
        issues.push('Missing default export');
      } else {
        hasDefaultExport = true;
      }

      // Check for component function/class
      const functionDeclarations = sourceFile.getFunctions();
      const variableDeclarations = sourceFile.getVariableDeclarations();

      let hasComponentFunction = false;

      for (const func of functionDeclarations) {
        const name = func.getName();
        if (name && /^[A-Z]/.test(name)) {
          hasComponentFunction = true;
          componentName = name;
          break;
        }
      }

      if (!hasComponentFunction) {
        for (const varDecl of variableDeclarations) {
          const name = varDecl.getName();
          if (name && /^[A-Z]/.test(name)) {
            const initializer: any = varDecl.getInitializer();
            if (
              initializer &&
              (ts.isArrowFunction(initializer.compilerNode) ||
                ts.isFunctionExpression(initializer.compilerNode))
            ) {
              hasComponentFunction = true;
              componentName = name;
              break;
            }
          }
        }
      }

      if (!hasComponentFunction) {
        issues.push(
          'No React component function found (must start with uppercase letter)'
        );
      }

      // Check for proper TypeScript props interface
      const interfaces = sourceFile.getInterfaces();
      const hasPropsInterface = interfaces.some(
        iface =>
          iface.getName().includes('Props') ||
          iface.getName().includes(componentName)
      );

      if (!hasPropsInterface && componentName) {
        issues.push(`Missing props interface (expected ${componentName}Props)`);
      }

      // Clean up
      this.project.removeSourceFile(sourceFile);
    } catch (error) {
      issues.push(
        `React component validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  async validateAccessibility(code: string): Promise<{
    isValid: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    // Check for missing accessibility attributes
    const accessibilityPatterns = [
      {
        pattern: /<button[^>]*>/gi,
        check: (match: string) =>
          !match.includes('aria-label') && !match.includes('aria-labelledby'),
        message: 'Button elements should have aria-label or aria-labelledby',
      },
      {
        pattern: /<input[^>]*>/gi,
        check: (match: string) =>
          !match.includes('aria-label') && !match.includes('aria-labelledby'),
        message: 'Input elements should have aria-label or aria-labelledby',
      },
      {
        pattern: /<img[^>]*>/gi,
        check: (match: string) => !match.includes('alt='),
        message: 'Image elements should have alt attributes',
      },
    ];

    for (const { pattern, check, message } of accessibilityPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (check(match)) {
            warnings.push(message);
          }
        }
      }
    }

    return {
      isValid: true, // Accessibility warnings don't make the code invalid
      warnings,
    };
  }
}
