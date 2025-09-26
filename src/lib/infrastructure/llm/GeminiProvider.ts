import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  GenerationRequest,
  GenerationResponse,
  ComponentCandidate,
  ComponentType,
  ComponentGenerationSchema,
} from '@/types';
import { ILLMProvider } from '../../domain/services/ComponentGenerationService';

export class GeminiProvider implements ILLMProvider {
  private client: GoogleGenerativeAI;
  private model: any;

  constructor(
    private apiKey: string,
    private modelName: string = 'gemini-2.5-flash'
  ) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    // Use the correct model name like in your working project
    const actualModelName =
      modelName === 'gemini-2.5-flash' ? modelName : 'gemini-2.5-flash';
    this.model = this.client.getGenerativeModel({ model: actualModelName });
  }

  async generateComponent(
    request: GenerationRequest
  ): Promise<GenerationResponse> {
    const startTime = Date.now();

    try {
      if (!this.apiKey) {
        throw new Error('Gemini API key not configured');
      }

      const prompt = this.buildGenerationPrompt(request);
      console.log('GeminiProvider: Sending request to Gemini API...');

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('GeminiProvider: Received response from Gemini API');
      console.log('Response length:', text.length);
      console.log('Response preview:', text);

      // Parse JSON response - handle markdown code blocks
      let parsedResponse;
      try {
        // First try direct parsing
        parsedResponse = JSON.parse(text);
      } catch (parseError) {
        console.log(
          'Direct JSON parsing failed, attempting to extract from markdown...'
        );
        // Remove markdown code blocks if present
        let cleanedText = text;

        // Remove ```json and ``` markers
        cleanedText = cleanedText.replace(/```json\s*/g, '');
        cleanedText = cleanedText.replace(/```\s*$/g, '');
        cleanedText = cleanedText.replace(/```/g, '');
        cleanedText = cleanedText.trim();

        try {
          parsedResponse = JSON.parse(cleanedText);
          console.log('Successfully parsed JSON after cleaning markdown');
          console.log('this is my component', parsedResponse);
        } catch (secondParseError) {
          // Last attempt: extract JSON object with better regex
          console.log('Attempting regex extraction...');

          // Try to find the most complete JSON object
          const jsonMatches = [
            // Try to match complete JSON objects
            cleanedText.match(/\{[\s\S]*?\}(?=\s*$)/),
            cleanedText.match(/\{[\s\S]*\}$/),
            cleanedText.match(/\{[\s\S]*\}/),
          ].filter(Boolean);

          let lastError = null;

          for (const match of jsonMatches) {
            if (match) {
              try {
                parsedResponse = JSON.parse(match[0]);
                console.log('Successfully parsed JSON from regex match');
                break;
              } catch (regexParseError) {
                lastError = regexParseError;
                console.log('Regex match failed, trying next pattern...');
              }
            }
          }

          if (!parsedResponse) {
            console.error('All JSON parsing attempts failed');
            console.error('Last error:', lastError);
            console.error(
              'Cleaned text preview:',
              cleanedText.substring(0, 1000)
            );

            throw new Error(
              `Failed to parse JSON response after all attempts. Raw response: ${text.substring(0, 500)}...`
            );
          }
        }
      }

      // Validate response against schema
      const validationResult =
        ComponentGenerationSchema.safeParse(parsedResponse);

      if (!validationResult.success) {
        throw new Error(
          `Invalid response schema: ${validationResult.error.message}`
        );
      }

      const processingTime = Date.now() - startTime;
      const tokenCount = this.estimateTokenCount(text);

      return {
        success: true,
        component: validationResult.data,
        metadata: {
          processingTime,
          tokensUsed: tokenCount,
          confidence: this.calculateConfidence(validationResult.data, request),
          intentMatch: this.calculateIntentMatch(
            request.prompt,
            validationResult.data
          ),
          complexity: this.determineComplexity(validationResult.data.code),
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('GeminiProvider: Error in generateComponent:', error);

      return {
        success: false,
        metadata: {
          processingTime,
          confidence: 0,
          intentMatch: 0,
          complexity: 'simple',
        },
        error: {
          type: 'generation',
          message:
            error instanceof Error ? error.message : 'Unknown generation error',
          details: error,
          recovery: {
            suggestions: [
              'Try simplifying your prompt',
              'Be more specific about the component type',
              'Check if the requested features are supported',
            ],
          },
        },
      };
    }
  }

  async analyzePrompt(prompt: string): Promise<ComponentCandidate[]> {
    try {
      console.log('GeminiProvider: Analyzing prompt...');
      const analysisPrompt = this.buildAnalysisPrompt(prompt);
      const result = await this.model.generateContent(analysisPrompt);
      const response = await result.response;
      const text = response.text();

      console.log('GeminiProvider: Analysis response received');
      console.log('Analysis response:', text);

      // Parse JSON response - handle markdown code blocks
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(text);
      } catch (parseError) {
        console.log('Analysis JSON parsing failed, cleaning markdown...');
        // Remove markdown code blocks if present
        let cleanedText = text
          .replace(/```json\s*/g, '')
          .replace(/```\s*$/g, '')
          .replace(/```/g, '')
          .trim();

        try {
          parsedResponse = JSON.parse(cleanedText);
        } catch (secondParseError) {
          // Return empty array if analysis fails - don't crash the generation
          console.error('Failed to parse analysis response:', secondParseError);
          return [];
        }
      }

      return parsedResponse.candidates || [];
    } catch (error) {
      console.error('GeminiProvider: Failed to analyze prompt:', error);
      // Return empty array instead of failing the entire generation
      return [];
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Test prompt');
      const response = await result.response;
      return response.text().length > 0;
    } catch (error) {
      return false;
    }
  }

  async getUsageStats(): Promise<{
    totalRequests: number;
    totalTokens: number;
    averageResponseTime: number;
    successRate: number;
    rateLimitHits: number;
  }> {
    // This would typically be implemented with usage tracking
    return {
      totalRequests: 0,
      totalTokens: 0,
      averageResponseTime: 0,
      successRate: 0,
      rateLimitHits: 0,
    };
  }

  private buildGenerationPrompt(request: GenerationRequest): string {
    const { prompt, preferredType, context, options } = request;

    const systemInstructions = `You are a React component generator. You MUST return ONLY valid JSON matching this exact schema:

{
  "componentType": "string (one of: ${Object.values(ComponentType).join(', ')})",
  "componentName": "string (PascalCase, starts with uppercase)",
  "propsSchema": {
    "props": [
      {
        "name": "string",
        "type": "string (TypeScript type)",
        "required": "boolean",
        "description": "string (optional)"
      }
    ]
  },
  "code": "string (complete React TypeScript component)",
  "previewContent": "string (complete HTML with inline JavaScript for iframe preview)",
  "variants": ["string array (optional)"],
  "description": "string (optional)",
  "examples": ["string array (optional)"]
}

CRITICAL RULES:
1. Output ONLY valid JSON - no text before or after
2. Generate TWO versions:
   - "code": Full TypeScript React component for download/editing
   - "previewContent": Complete HTML page with inline JavaScript for iframe preview
3. The previewContent must be a complete HTML document that renders the component using vanilla JavaScript and React from CDN
4. Use ONLY these imports in code: @mui/material, @mui/x-data-grid (tables only), react-hook-form (forms only)
5. Component name must be PascalCase and descriptive
6. NO dangerouslySetInnerHTML, window, document.cookie, or external network calls
7. Include proper accessibility attributes (aria-label, role, etc.)
8. IMPORTANT: Component should be fully functional with default props for preview purposes
9. For tables: provide default sample data (users, products, etc.)
10. For forms: provide default values and handlers that show alerts
11. For buttons: provide default onClick handlers

PREVIEW CONTENT REQUIREMENTS:
- Complete HTML document with DOCTYPE, head, body
- Load React, ReactDOM, and MUI from CDN (esm.sh)
- Use vanilla JavaScript with React.createElement
- Include proper error handling
- Component should render immediately without external dependencies
- Use string concatenation instead of template literals
- All event handlers should work (alerts, console.log, etc.)`;

    const contextInfo = context
      ? `
Theme: ${context.theme}
Accessibility required: ${context.accessibility}
Responsive: ${context.responsive}
TypeScript: ${context.typescript}`
      : '';

    const optionsInfo = options
      ? `
Include examples: ${options.includeExamples}
Include comments: ${options.includeComments}
Max complexity: ${options.maxComplexity}
Allow custom: ${options.allowCustomComponents}`
      : '';

    const preferredTypeInfo = preferredType
      ? `
Preferred component type: ${preferredType}`
      : '';

    const examples = this.getFewShotExamples();

    return `${systemInstructions}

${contextInfo}
${optionsInfo}
${preferredTypeInfo}

Examples:
${examples}

User Request: "${prompt}"

Generate the component as JSON:`;
  }

  private buildAnalysisPrompt(prompt: string): string {
    return `Analyze this component request and return JSON with possible component types ranked by relevance:

{
  "candidates": [
    {
      "type": "ComponentType",
      "score": 0.95,
      "reason": "explanation",
      "confidence": 0.9
    }
  ]
}

Available types: ${Object.values(ComponentType).join(', ')}

User request: "${prompt}"

Return analysis as JSON:`;
  }

  private getFewShotExamples(): string {
    return `
Example 1:
Input: "simple button with click handler"
Output: {
  "componentType": "MUIButton",
  "componentName": "ActionButton",
  "propsSchema": {
    "props": [
      {"name": "label", "type": "string", "required": false},
      {"name": "onClick", "type": "() => void", "required": false},
      {"name": "variant", "type": "'contained' | 'outlined' | 'text'", "required": false}
    ]
  },
  "code": "import React from 'react';\\nimport { Button } from '@mui/material';\\n\\ninterface ActionButtonProps {\\n  label?: string;\\n  onClick?: () => void;\\n  variant?: 'contained' | 'outlined' | 'text';\\n}\\n\\nconst ActionButton: React.FC<ActionButtonProps> = ({ \\n  label = 'Click Me', \\n  onClick = () => alert('Button clicked!'), \\n  variant = 'contained' \\n}) => {\\n  return (\\n    <Button \\n      variant={variant} \\n      onClick={onClick}\\n      sx={{ m: 2 }}\\n    >\\n      {label}\\n    </Button>\\n  );\\n};\\n\\nexport default ActionButton;",
  "previewContent": "<!DOCTYPE html>\\n<html lang=\\"en\\">\\n<head>\\n  <meta charset=\\"UTF-8\\">\\n  <meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1.0\\">\\n  <title>ActionButton Preview</title>\\n  <link rel=\\"stylesheet\\" href=\\"https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap\\">\\n  <style>\\n    body { margin: 0; padding: 16px; font-family: 'Roboto', sans-serif; background-color: #fafafa; }\\n  </style>\\n</head>\\n<body>\\n  <div id=\\"root\\"></div>\\n  <script type=\\"module\\">\\n    import React from 'https://esm.sh/react@18';\\n    import { createRoot } from 'https://esm.sh/react-dom@18/client';\\n    import { Button } from 'https://esm.sh/@mui/material@5.15.0';\\n\\n    const ActionButton = () => {\\n      const handleClick = () => alert('Button clicked!');\\n      return React.createElement(Button, {\\n        variant: 'contained',\\n        onClick: handleClick,\\n        sx: { m: 2 }\\n      }, 'Click Me');\\n    };\\n\\n    const root = createRoot(document.getElementById('root'));\\n    root.render(React.createElement(ActionButton));\\n  </script>\\n</body>\\n</html>"
}

Example 2:
Input: "card with title and description"
Output: {
  "componentType": "MUICard",
  "componentName": "InfoCard",
  "propsSchema": {
    "props": [
      {"name": "title", "type": "string", "required": false},
      {"name": "description", "type": "string", "required": false}
    ]
  },
  "code": "import React from 'react';\\nimport { Card, CardContent, Typography } from '@mui/material';\\n\\ninterface InfoCardProps {\\n  title?: string;\\n  description?: string;\\n}\\n\\nconst InfoCard: React.FC<InfoCardProps> = ({ \\n  title = 'Sample Title', \\n  description = 'This is a sample description for the card component.' \\n}) => {\\n  return (\\n    <Card sx={{ maxWidth: 400, m: 2 }}>\\n      <CardContent>\\n        <Typography variant=\\"h5\\" component=\\"h2\\" gutterBottom>\\n          {title}\\n        </Typography>\\n        <Typography variant=\\"body2\\" color=\\"text.secondary\\">\\n          {description}\\n        </Typography>\\n      </CardContent>\\n    </Card>\\n  );\\n};\\n\\nexport default InfoCard;",
  "previewContent": "<!DOCTYPE html>\\n<html lang=\\"en\\">\\n<head>\\n  <meta charset=\\"UTF-8\\">\\n  <meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1.0\\">\\n  <title>InfoCard Preview</title>\\n  <link rel=\\"stylesheet\\" href=\\"https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap\\">\\n  <style>\\n    body { margin: 0; padding: 16px; font-family: 'Roboto', sans-serif; background-color: #fafafa; }\\n  </style>\\n</head>\\n<body>\\n  <div id=\\"root\\"></div>\\n  <script type=\\"module\\">\\n    import React from 'https://esm.sh/react@18';\\n    import { createRoot } from 'https://esm.sh/react-dom@18/client';\\n    import { Card, CardContent, Typography } from 'https://esm.sh/@mui/material@5.15.0';\\n\\n    const InfoCard = () => {\\n      return React.createElement(Card, { sx: { maxWidth: 400, m: 2 } },\\n        React.createElement(CardContent, null,\\n          React.createElement(Typography, { variant: 'h5', component: 'h2', gutterBottom: true }, 'Sample Title'),\\n          React.createElement(Typography, { variant: 'body2', color: 'text.secondary' }, 'This is a sample description for the card component.')\\n        )\\n      );\\n    };\\n\\n    const root = createRoot(document.getElementById('root'));\\n    root.render(React.createElement(InfoCard));\\n  </script>\\n</body>\\n</html>"
}`;
  }

  private calculateConfidence(
    component: any,
    request: GenerationRequest
  ): number {
    let confidence = 0.8; // Base confidence

    // Check if preferred type matches
    if (
      request.preferredType &&
      component.componentType === request.preferredType
    ) {
      confidence += 0.1;
    }

    // Check prompt keywords match
    const promptWords = request.prompt.toLowerCase().split(/\s+/);
    const componentTypeWords = component.componentType
      .toLowerCase()
      .split(/(?=[A-Z])/);

    const matches = promptWords.filter(word =>
      componentTypeWords.some((typeWord: string | string[]) =>
        typeWord.includes(word)
      )
    );

    confidence += (matches.length / promptWords.length) * 0.1;

    return Math.min(confidence, 1.0);
  }

  private calculateIntentMatch(prompt: string, component: any): number {
    const promptLower = prompt.toLowerCase();
    const componentTypeLower = component.componentType.toLowerCase();

    // Simple keyword matching
    const typeKeywords = {
      muitable: ['table', 'grid', 'list', 'data', 'rows', 'columns'],
      muibutton: ['button', 'click', 'action', 'submit'],
      muiform: ['form', 'input', 'field', 'submit', 'validation'],
      muidialog: ['dialog', 'modal', 'popup', 'alert', 'confirm'],
      muicard: ['card', 'content', 'display', 'info'],
    };

    const keywords =
      typeKeywords[componentTypeLower as keyof typeof typeKeywords] || [];
    const matches = keywords.filter(keyword => promptLower.includes(keyword));

    return matches.length / Math.max(keywords.length, 1);
  }

  private determineComplexity(code: string): 'simple' | 'medium' | 'complex' {
    const lines = code.split('\n').length;
    const hasHooks = /use[A-Z]/.test(code);
    const hasEffects = /useEffect|useCallback|useMemo/.test(code);
    const hasComplexLogic = /if|switch|for|while|map|filter|reduce/.test(code);

    if (lines > 200 || (hasEffects && hasComplexLogic)) {
      return 'complex';
    } else if (lines > 50 || hasHooks || hasComplexLogic) {
      return 'medium';
    } else {
      return 'simple';
    }
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
