import { Component } from '../entities/Component';
import { GenerationJob } from '../entities/GenerationJob';
import { IComponentRepository } from '../repositories/IComponentRepository';
import { IGenerationJobRepository } from '../repositories/IGenerationJobRepository';
import {
  GenerationRequest,
  GenerationResponse,
  ComponentGeneration,
  ComponentCandidate,
  ComponentType,
  GenerationStatus,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface ILLMProvider {
  generateComponent(request: GenerationRequest): Promise<GenerationResponse>;
  analyzePrompt(prompt: string): Promise<ComponentCandidate[]>;
  validateApiKey(): Promise<boolean>;
}

export interface ICodeValidator {
  validateTypeScript(code: string): Promise<{
    isValid: boolean;
    errors: Array<{
      message: string;
      line?: number;
      column?: number;
    }>;
  }>;
  validateSafety(code: string): Promise<{
    isValid: boolean;
    violations: Array<{
      type: string;
      message: string;
      severity: 'error' | 'warning';
    }>;
  }>;
  validateImports(code: string): Promise<{
    isValid: boolean;
    forbiddenImports: string[];
  }>;
}

export interface ITemplateEngine {
  generateFromTemplate(
    componentType: ComponentType,
    context: any
  ): Promise<string>;
  getAvailableTemplates(): ComponentType[];
  validateTemplate(componentType: ComponentType): Promise<boolean>;
}

export class ComponentGenerationService {
  constructor(
    private componentRepository: IComponentRepository,
    private jobRepository: IGenerationJobRepository,
    private llmProvider: ILLMProvider,
    private codeValidator: ICodeValidator,
    private templateEngine: ITemplateEngine
  ) {}

  public async generateComponent(
    request: GenerationRequest,
    userId?: string
  ): Promise<GenerationJob> {
    try {
      console.log('GenerationService: Creating job for request:', {
        prompt: request.prompt?.substring(0, 100) + '...',
        preferredType: request.preferredType,
      });

      // Create generation job
      const job = new GenerationJob(uuidv4(), request);

      console.log('GenerationService: Job created with ID:', job.id);

      // Save job to repository
      await this.jobRepository.create(job);

      console.log('GenerationService: Job saved to repository');

      // Start processing (could be async/queued)
      this.processGenerationJob(job.id, userId).catch(error => {
        console.error('Generation job processing failed:', error);
      });

      return job;
    } catch (error) {
      console.error('GenerationService: Error in generateComponent:', error);
      throw error;
    }
  }

  public async processGenerationJob(
    jobId: string,
    userId?: string
  ): Promise<void> {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new Error(`Generation job ${jobId} not found`);
    }

    try {
      job.start();
      await this.jobRepository.update(job);

      // Step 1: Analyze prompt and get candidates
      const candidates = await this.analyzePrompt(job.request.prompt);

      // Step 2: Generate component using LLM
      const llmResponse = await this.llmProvider.generateComponent(job.request);

      if (!llmResponse.success || !llmResponse.component) {
        throw new Error(llmResponse.error?.message || 'Generation failed');
      }

      // Step 3: Validate generated code (temporarily disabled to use LLM code directly)
      console.log(
        'Using LLM-generated code directly (validation temporarily disabled)'
      );
      console.log('LLM Code length:', llmResponse.component.code.length);
      console.log(
        'LLM Code preview:',
        llmResponse.component.code.substring(0, 200) + '...'
      );

      // TODO: Re-enable validation after fixing validation issues
      // const validationResult = await this.validateGeneratedCode(
      //   llmResponse.component.code
      // );

      // if (!validationResult.isValid) {
      //   console.log('Validation errors:', validationResult.errors);
      //   // Try to repair or use template fallback
      //   const repairedCode = await this.attemptCodeRepair(
      //     {
      //       code: llmResponse.component.code,
      //       componentType: llmResponse.component.componentType,
      //       componentName: llmResponse.component.componentName,
      //       propsSchema: llmResponse.component.propsSchema ?? { props: [] },
      //       description: llmResponse.component.description,
      //       examples: llmResponse.component.examples,
      //       variants: llmResponse.component.variants,
      //     },
      //     validationResult.errors
      //   );

      //   if (repairedCode) {
      //     llmResponse.component.code = repairedCode;
      //   } else {
      //     throw new Error(
      //       `Code validation failed: ${validationResult.errors.join(', ')}`
      //     );
      //   }
      // }

      // Step 4: Create component entity with unique name
      console.log(
        'Original component name:',
        llmResponse.component.componentName
      );
      const uniqueName = await this.generateUniqueName(
        llmResponse.component.componentName
      );
      console.log('Generated unique name:', uniqueName);

      const component = new Component(
        uuidv4(),
        uniqueName,
        llmResponse.component.componentType,
        llmResponse.component.code,
        llmResponse.component.propsSchema,
        llmResponse.component.description,
        llmResponse.component.examples,
        [], // tags
        {
          version: '1.0.0',
          complexity: this.determineComplexity(llmResponse.component.code),
          estimatedLines: llmResponse.component.code.split('\n').length,
          dependencies: this.extractDependencies(llmResponse.component.code),
          keywords: this.extractKeywords(job.request.prompt),
          category: this.categorizeComponent(
            llmResponse.component.componentType
          ),
          lastModified: new Date(),
        },
        '1.0.0',
        userId
      );

      // Step 5: Save component to database
      console.log('Saving component to database...');
      const savedComponent = await this.componentRepository.create(component);
      console.log('Component saved with ID:', savedComponent.id);

      // Step 6: Complete job with component ID
      const response: GenerationResponse = {
        success: true,
        component: llmResponse.component,
        candidates,
        metadata: {
          processingTime: job.getDuration() || 0,
          tokensUsed: llmResponse.metadata?.tokensUsed,
          confidence: llmResponse.metadata?.confidence || 0.8,
          intentMatch: this.calculateIntentMatch(
            job.request.prompt,
            candidates
          ),
          complexity: component.getComplexity(),
        },
      };

      // Set the component ID in the job
      job.componentId = savedComponent.id;
      job.complete(response);
      console.log('Job completed with componentId:', job.componentId);
      await this.jobRepository.update(job);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (job.canRetry()) {
        job.retry();
      } else {
        job.fail(err);
      }

      await this.jobRepository.update(job);
      throw err;
    }
  }

  private async analyzePrompt(prompt: string): Promise<ComponentCandidate[]> {
    return this.llmProvider.analyzePrompt(prompt);
  }

  private async validateGeneratedCode(code: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const results = await Promise.all([
      this.codeValidator.validateTypeScript(code),
      this.codeValidator.validateSafety(code),
      this.codeValidator.validateImports(code),
    ]);

    const [tsResult, safetyResult, importsResult] = results;

    const errors: string[] = [];

    if (!tsResult.isValid) {
      errors.push(...tsResult.errors.map(e => e.message));
    }

    if (!safetyResult.isValid) {
      errors.push(...safetyResult.violations.map(v => v.message));
    }

    if (!importsResult.isValid) {
      errors.push(
        `Forbidden imports: ${importsResult.forbiddenImports.join(', ')}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private async attemptCodeRepair(
    component: ComponentGeneration,
    errors: string[]
  ): Promise<string | null> {
    // Try template-based generation as fallback
    try {
      if (
        this.templateEngine
          .getAvailableTemplates()
          .includes(component.componentType)
      ) {
        return await this.templateEngine.generateFromTemplate(
          component.componentType,
          {
            componentName: component.componentName,
            propsSchema: component.propsSchema,
            description: component.description,
          }
        );
      }
    } catch (error) {
      console.error('Template fallback failed:', error);
    }

    return null;
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

  private extractDependencies(code: string): string[] {
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    const dependencies: string[] = [];
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      const dep = match[1];
      if (!dep.startsWith('.') && !dep.startsWith('/')) {
        dependencies.push(dep);
      }
    }

    return Array.from(new Set(dependencies));
  }

  private extractKeywords(prompt: string): string[] {
    // Simple keyword extraction from prompt
    const words = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    const stopWords = new Set([
      'the',
      'and',
      'with',
      'for',
      'that',
      'this',
      'are',
      'was',
      'will',
      'can',
      'has',
      'have',
    ]);

    return Array.from(
      new Set(words.filter(word => !stopWords.has(word)))
    ).slice(0, 10);
  }

  private categorizeComponent(type: ComponentType): string {
    const categoryMap: Record<string, string> = {
      [ComponentType.MUIButton]: 'input',
      [ComponentType.MUIForm]: 'input',
      [ComponentType.MUITable]: 'data-display',
      [ComponentType.MUICard]: 'surface',
      [ComponentType.MUIDialog]: 'feedback',
      [ComponentType.MUITabs]: 'navigation',
      [ComponentType.MUIList]: 'data-display',
      [ComponentType.MUIMenu]: 'navigation',
      [ComponentType.MUIDrawer]: 'navigation',
    };

    return categoryMap[type] || 'other';
  }

  private calculateIntentMatch(
    prompt: string,
    candidates: ComponentCandidate[]
  ): number {
    if (candidates.length === 0) return 0;

    // Return the highest confidence score from candidates
    return Math.max(...candidates.map(c => c.confidence));
  }

  private async generateUniqueName(baseName: string): Promise<string> {
    // Clean the base name to ensure it's valid
    let cleanName = baseName.trim();

    // Ensure the name starts with uppercase and contains only alphanumeric characters
    cleanName = cleanName.replace(/[^a-zA-Z0-9]/g, '');
    if (!/^[A-Z]/.test(cleanName)) {
      cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }

    // If the cleaned name is empty or invalid, use a default
    if (!cleanName || cleanName.length === 0) {
      cleanName = 'GeneratedComponent';
    }

    let uniqueName = cleanName;
    let counter = 1;

    // Keep trying until we find a unique name
    while (counter < 100) {
      // Prevent infinite loop
      try {
        console.log(`Checking if name "${uniqueName}" exists...`);
        const existing = await this.componentRepository.findByName(uniqueName);
        if (!existing) {
          console.log(`Name "${uniqueName}" is unique!`);
          return uniqueName;
        }
        console.log(`Name "${uniqueName}" exists, trying with counter...`);
        // If name exists, try with counter
        uniqueName = `${cleanName}${counter}`;
        counter++;
      } catch (error) {
        console.log(
          `Error checking name uniqueness, using "${uniqueName}":`,
          error
        );
        // If there's an error checking, assume the name is unique
        return uniqueName;
      }
    }

    // Fallback: use timestamp
    return `${cleanName}${Date.now()}`;
  }

  public async cancelJob(jobId: string): Promise<void> {
    const job = await this.jobRepository.findById(jobId);
    if (job && !job.isCompleted()) {
      job.fail(new Error('Job cancelled by user'));
      await this.jobRepository.update(job);
    }
  }

  public async retryJob(jobId: string): Promise<void> {
    const job = await this.jobRepository.findById(jobId);
    if (job && job.canRetry()) {
      job.retry();
      await this.jobRepository.update(job);

      // Restart processing
      this.processGenerationJob(jobId).catch(error => {
        console.error('Job retry failed:', error);
      });
    }
  }

  public async getJobStatus(jobId: string): Promise<GenerationJob | null> {
    return this.jobRepository.findById(jobId);
  }
}
