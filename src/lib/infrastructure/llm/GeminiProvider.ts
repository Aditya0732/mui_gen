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
    private modelName: string = 'gemini-1.5-flash'
  ) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    // Use the correct model name like in your working project
    const actualModelName =
      modelName === 'gemini-pro' ? 'gemini-1.5-flash' : modelName;
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
      console.log('Response preview:', text.substring(0, 500) + '...');

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
      console.log('Analysis response:', text.substring(0, 200) + '...');

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
  "variants": ["string array (optional)"],
  "description": "string (optional)",
  "examples": ["string array (optional)"]
}

CRITICAL RULES:
1. Output ONLY valid JSON - no text before or after
2. Use ONLY these imports: @mui/material, @mui/x-data-grid (tables only), react-hook-form (forms only)
3. Component must have default export
4. Use TypeScript with strongly typed props (no 'any')
5. NO dangerouslySetInnerHTML, window, document.cookie, or external network calls
6. Include proper accessibility attributes (aria-label, role, etc.)
7. Component name must be PascalCase and descriptive`;

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
Input: "table with name and email columns, edit and delete actions"
Output: {
  "componentType": "MUITable",
  "componentName": "UserTable",
  "propsSchema": {
    "props": [
      {"name": "rows", "type": "Array<{id: string; name: string; email: string}>", "required": true},
      {"name": "onEdit", "type": "(row: any) => void", "required": false},
      {"name": "onDelete", "type": "(row: any) => void", "required": false}
    ]
  },
  "code": "import React from 'react';\\nimport { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';\\nimport { EditIcon, DeleteIcon } from '@mui/icons-material';\\n\\ninterface UserTableProps {\\n  rows: Array<{id: string; name: string; email: string}>;\\n  onEdit?: (row: any) => void;\\n  onDelete?: (row: any) => void;\\n}\\n\\nconst UserTable: React.FC<UserTableProps> = ({ rows, onEdit, onDelete }) => {\\n  const columns: GridColDef[] = [\\n    { field: 'name', headerName: 'Name', width: 150 },\\n    { field: 'email', headerName: 'Email', width: 200 },\\n    {\\n      field: 'actions',\\n      type: 'actions',\\n      headerName: 'Actions',\\n      width: 100,\\n      getActions: (params) => [\\n        <GridActionsCellItem\\n          icon={<EditIcon />}\\n          label=\\"Edit\\"\\n          onClick={() => onEdit?.(params.row)}\\n        />,\\n        <GridActionsCellItem\\n          icon={<DeleteIcon />}\\n          label=\\"Delete\\"\\n          onClick={() => onDelete?.(params.row)}\\n        />\\n      ]\\n    }\\n  ];\\n\\n  return (\\n    <DataGrid\\n      rows={rows}\\n      columns={columns}\\n      autoHeight\\n      disableRowSelectionOnClick\\n    />\\n  );\\n};\\n\\nexport default UserTable;"
}

Example 2:
Input: "contact form with name, email, message fields"
Output: {
  "componentType": "MUIForm",
  "componentName": "ContactForm",
  "propsSchema": {
    "props": [
      {"name": "onSubmit", "type": "(data: ContactFormData) => void", "required": true},
      {"name": "loading", "type": "boolean", "required": false}
    ]
  },
  "code": "import React from 'react';\\nimport { useForm, Controller } from 'react-hook-form';\\nimport { Box, TextField, Button, Typography } from '@mui/material';\\n\\ninterface ContactFormData {\\n  name: string;\\n  email: string;\\n  message: string;\\n}\\n\\ninterface ContactFormProps {\\n  onSubmit: (data: ContactFormData) => void;\\n  loading?: boolean;\\n}\\n\\nconst ContactForm: React.FC<ContactFormProps> = ({ onSubmit, loading }) => {\\n  const { control, handleSubmit, formState: { errors } } = useForm<ContactFormData>();\\n\\n  return (\\n    <Box component=\\"form\\" onSubmit={handleSubmit(onSubmit)} sx={{ maxWidth: 600 }}>\\n      <Typography variant=\\"h5\\" component=\\"h2\\" gutterBottom>\\n        Contact Us\\n      </Typography>\\n      \\n      <Controller\\n        name=\\"name\\"\\n        control={control}\\n        rules={{ required: 'Name is required' }}\\n        render={({ field }) => (\\n          <TextField\\n            {...field}\\n            fullWidth\\n            label=\\"Name\\"\\n            error={!!errors.name}\\n            helperText={errors.name?.message}\\n            margin=\\"normal\\"\\n          />\\n        )}\\n      />\\n      \\n      <Controller\\n        name=\\"email\\"\\n        control={control}\\n        rules={{ \\n          required: 'Email is required',\\n          pattern: { value: /^[^@]+@[^@]+\\.[^@]+$/, message: 'Invalid email' }\\n        }}\\n        render={({ field }) => (\\n          <TextField\\n            {...field}\\n            fullWidth\\n            label=\\"Email\\"\\n            type=\\"email\\"\\n            error={!!errors.email}\\n            helperText={errors.email?.message}\\n            margin=\\"normal\\"\\n          />\\n        )}\\n      />\\n      \\n      <Controller\\n        name=\\"message\\"\\n        control={control}\\n        rules={{ required: 'Message is required' }}\\n        render={({ field }) => (\\n          <TextField\\n            {...field}\\n            fullWidth\\n            label=\\"Message\\"\\n            multiline\\n            rows={4}\\n            error={!!errors.message}\\n            helperText={errors.message?.message}\\n            margin=\\"normal\\"\\n          />\\n        )}\\n      />\\n      \\n      <Button\\n        type=\\"submit\\"\\n        variant=\\"contained\\"\\n        color=\\"primary\\"\\n        disabled={loading}\\n        sx={{ mt: 2 }}\\n      >\\n        {loading ? 'Sending...' : 'Send Message'}\\n      </Button>\\n    </Box>\\n  );\\n};\\n\\nexport default ContactForm;"
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
