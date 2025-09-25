import { Component } from '../../domain/entities/Component';
import { IComponentRepository } from '../../domain/repositories/IComponentRepository';
import { ComponentGenerationService } from '../../domain/services/ComponentGenerationService';
import {
  GenerationRequest,
  ComponentSearchOptions,
  ComponentType,
  ExportOptions,
  ValidationResult,
  GenerationJob,
} from '@/types';
import { ApiError, ApiErrorCode } from '@/types/api';

export class ComponentApplicationService {
  constructor(
    private componentRepository: IComponentRepository,
    private generationService: ComponentGenerationService
  ) {}

  // Component Generation
  public async generateComponent(
    request: GenerationRequest,
    userId?: string
  ): Promise<{
    jobId: string;
    estimatedTime: number;
  }> {
    try {
      console.log(
        'ApplicationService: Starting component generation with request:',
        {
          prompt: request.prompt,
          preferredType: request.preferredType,
          hasOptions: !!request.options,
        }
      );

      const job = await this.generationService.generateComponent(
        request,
        userId
      );

      console.log('ApplicationService: Job created successfully:', job.id);

      return {
        jobId: job.id,
        estimatedTime: this.estimateGenerationTime(request),
      };
    } catch (error) {
      console.error('ApplicationService: Error in generateComponent:', error);
      throw new ApiError(
        ApiErrorCode.LLM_ERROR,
        'Failed to start component generation',
        500,
        error
      );
    }
  }

  public async getGenerationStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    result?: any;
    error?: string;
  }> {
    const job = await this.generationService.getJobStatus(jobId);

    if (!job) {
      throw new ApiError(
        ApiErrorCode.NOT_FOUND,
        'Generation job not found',
        404
      );
    }

    return {
      status: job.status,
      progress: job.getProgressPercentage(),
      result: job.result,
      error: job.error?.message || 'Unknown Error',
    };
  }

  // Component CRUD Operations
  public async createComponent(
    componentData: {
      name: string;
      type: ComponentType;
      code: string;
      propsSchema: any;
      description?: string;
      examples?: string[];
      tags?: string[];
    },
    userId?: string
  ): Promise<Component> {
    try {
      // Check if component name already exists
      const existingComponent = await this.componentRepository.findByName(
        componentData.name
      );
      if (existingComponent) {
        throw new ApiError(
          ApiErrorCode.VALIDATION_ERROR,
          `Component with name '${componentData.name}' already exists`,
          409
        );
      }

      const component = new Component(
        this.generateId(),
        componentData.name,
        componentData.type,
        componentData.code,
        componentData.propsSchema,
        componentData.description,
        componentData.examples,
        componentData.tags || [],
        undefined,
        '1.0.0',
        userId
      );

      return await this.componentRepository.create(component);
    } catch (error) {
      if (error instanceof ApiError) throw error;

      throw new ApiError(
        ApiErrorCode.INTERNAL_ERROR,
        'Failed to create component',
        500,
        error
      );
    }
  }

  public async getComponent(id: string): Promise<Component> {
    const component = await this.componentRepository.findById(id);

    if (!component) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Component not found', 404);
    }

    // Increment usage count
    component.incrementUsage();
    await this.componentRepository.update(component);

    return component;
  }

  public async updateComponent(
    id: string,
    updates: {
      name?: string;
      code?: string;
      description?: string;
      tags?: string[];
    },
    userId?: string
  ): Promise<Component> {
    const component = await this.componentRepository.findById(id);

    if (!component) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Component not found', 404);
    }

    // Check ownership
    if (userId && !component.isOwnedBy(userId)) {
      throw new ApiError(
        ApiErrorCode.AUTHORIZATION_ERROR,
        'You do not have permission to update this component',
        403
      );
    }

    // Validate name uniqueness if changing name
    if (updates.name && updates.name !== component.name) {
      const existingComponent = await this.componentRepository.findByName(
        updates.name
      );
      if (existingComponent && existingComponent.id !== id) {
        throw new ApiError(
          ApiErrorCode.VALIDATION_ERROR,
          `Component with name '${updates.name}' already exists`,
          409
        );
      }
    }

    // Apply updates
    const updatedComponent = new Component(
      component.id,
      updates.name || component.name,
      component.type,
      updates.code || component.code,
      component.propsSchema,
      updates.description ?? component.description,
      component.examples,
      updates.tags || component.tags,
      component.metadata,
      component.version,
      component.ownerId,
      component.createdAt,
      new Date(), // updatedAt
      component.usageCount,
      component.lastUsedAt
    );

    return await this.componentRepository.update(updatedComponent);
  }

  public async deleteComponent(id: string, userId?: string): Promise<void> {
    const component = await this.componentRepository.findById(id);

    if (!component) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Component not found', 404);
    }

    // Check ownership
    if (userId && !component.isOwnedBy(userId)) {
      throw new ApiError(
        ApiErrorCode.AUTHORIZATION_ERROR,
        'You do not have permission to delete this component',
        403
      );
    }

    await this.componentRepository.delete(id);
  }

  // Component Search and Discovery
  public async searchComponents(
    searchOptions: ComponentSearchOptions
  ): Promise<{
    components: Component[];
    total: number;
    hasMore: boolean;
  }> {
    const result = await this.componentRepository.search(searchOptions);

    return {
      components: result.components,
      total: result.total,
      hasMore:
        (searchOptions.offset || 0) + result.components.length < result.total,
    };
  }

  public async getComponentsByType(
    type: ComponentType,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    components: Component[];
    total: number;
  }> {
    return await this.componentRepository.findByType(type, options);
  }

  public async getPopularComponents(limit: number = 10): Promise<Component[]> {
    return await this.componentRepository.getMostUsed(limit);
  }

  public async getRecentComponents(limit: number = 10): Promise<Component[]> {
    return await this.componentRepository.getRecentlyCreated(limit);
  }

  // Component Export
  public async exportComponent(
    id: string,
    options: ExportOptions
  ): Promise<{
    filename: string;
    content: string;
    mimeType: string;
  }> {
    const component = await this.getComponent(id);

    const content = this.formatComponentForExport(component, options);
    const extension = options.format === 'js' ? 'js' : 'tsx';
    const filename = `${component.name}.${extension}`;

    return {
      filename,
      content,
      mimeType: 'text/plain',
    };
  }

  public async exportMultipleComponents(
    ids: string[],
    options: ExportOptions
  ): Promise<{
    filename: string;
    content: string;
    mimeType: string;
  }> {
    const components = await this.componentRepository.exportComponents(ids);

    if (components.length === 0) {
      throw new ApiError(
        ApiErrorCode.NOT_FOUND,
        'No components found for export',
        404
      );
    }

    const archive = this.createComponentArchive(components, options);

    return {
      filename: 'components.zip',
      content: archive,
      mimeType: 'application/zip',
    };
  }

  // Component Statistics
  public async getComponentStats(): Promise<{
    totalComponents: number;
    componentsByType: Array<{
      type: ComponentType;
      count: number;
    }>;
    mostUsed: Component[];
    recentlyCreated: Component[];
  }> {
    const [totalComponents, componentsByType, mostUsed, recentlyCreated] =
      await Promise.all([
        this.componentRepository.getTotalCount(),
        this.componentRepository.getCountByType(),
        this.componentRepository.getMostUsed(5),
        this.componentRepository.getRecentlyCreated(5),
      ]);

    return {
      totalComponents,
      componentsByType,
      mostUsed,
      recentlyCreated,
    };
  }

  public async getUserComponents(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    components: Component[];
    total: number;
  }> {
    return await this.componentRepository.findByOwner(userId, options);
  }

  // Helper methods
  private generateId(): string {
    return require('uuid').v4();
  }

  private estimateGenerationTime(request: GenerationRequest): number {
    // Base time estimation in milliseconds
    let baseTime = 3000; // 3 seconds base

    // Add time based on complexity
    const promptLength = request.prompt.length;
    if (promptLength > 500) baseTime += 2000;
    if (promptLength > 1000) baseTime += 3000;

    // Add time for specific options
    if (request.options?.includeExamples) baseTime += 1000;
    if (request.context?.accessibility) baseTime += 1500;

    return baseTime;
  }

  private formatComponentForExport(
    component: Component,
    options: ExportOptions
  ): string {
    let content = '';

    // Add header comment
    if (options.includeComments) {
      content += `/*\n`;
      content += ` * Component: ${component.name}\n`;
      content += ` * Type: ${component.type}\n`;
      if (component.description) {
        content += ` * Description: ${component.description}\n`;
      }
      content += ` * Generated: ${new Date().toISOString()}\n`;
      content += ` * Version: ${component.version}\n`;
      content += ` */\n\n`;
    }

    // Add component code
    content += component.code;

    // Add usage examples
    if (options.includeExamples && component.examples) {
      content += '\n\n/*\n * Usage Examples:\n *\n';
      component.examples.forEach((example, index) => {
        content += ` * Example ${index + 1}:\n`;
        content += ` * ${example.split('\n').join('\n * ')}\n *\n`;
      });
      content += ' */';
    }

    return content;
  }

  private createComponentArchive(
    components: Component[],
    options: ExportOptions
  ): string {
    // This would typically use a library like JSZip
    // For now, return a simple concatenated format
    let archive = '';

    components.forEach((component, index) => {
      if (index > 0) archive += '\n\n' + '='.repeat(50) + '\n\n';
      archive += this.formatComponentForExport(component, options);
    });

    return archive;
  }

  async getJobStatus(jobId: string): Promise<GenerationJob | null> {
    return this.generationService.getJobStatus(jobId);
  }

  async getComponentById(componentId: string): Promise<Component | null> {
    return this.componentRepository.findById(componentId);
  }
}
