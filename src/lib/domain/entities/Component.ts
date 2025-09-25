import { ComponentType, PropsSchema, ComponentMetadata } from '@/types';

export class Component {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: ComponentType,
    public readonly code: string,
    public readonly propsSchema: PropsSchema,
    public readonly description?: string,
    public readonly examples?: string[],
    public readonly tags: string[] = [],
    public readonly metadata?: ComponentMetadata,
    public readonly version: string = '1.0.0',
    public readonly ownerId?: string,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
    public usageCount: number = 0,
    public lastUsedAt?: Date
  ) {
    this.validateName(name);
    this.validateCode(code);
    this.validatePropsSchema(propsSchema);
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Component name cannot be empty');
    }
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      throw new Error('Component name must start with uppercase letter and contain only alphanumeric characters');
    }
  }

  private validateCode(code: string): void {
    if (!code || code.trim().length === 0) {
      throw new Error('Component code cannot be empty');
    }
    if (code.length > 50000) {
      throw new Error('Component code is too large (max 50,000 characters)');
    }
  }

  private validatePropsSchema(propsSchema: PropsSchema): void {
    if (!propsSchema || !propsSchema.props || !Array.isArray(propsSchema.props)) {
      throw new Error('Invalid props schema');
    }
  }

  public incrementUsage(): void {
    this.usageCount++;
    this.lastUsedAt = new Date();
  }

  public addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  public removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
    }
  }

  public updateMetadata(metadata: Partial<ComponentMetadata>): void {
    if (this.metadata) {
      Object.assign(this.metadata, metadata);
    }
  }

  public isOwnedBy(userId: string): boolean {
    return this.ownerId === userId;
  }

  public getComplexity(): 'simple' | 'medium' | 'complex' {
    if (!this.metadata) return 'medium';
    return this.metadata.complexity;
  }

  public getEstimatedLines(): number {
    if (this.metadata?.estimatedLines) {
      return this.metadata.estimatedLines;
    }
    // Estimate based on code length
    const lines = this.code.split('\n').length;
    return lines;
  }

  public getDependencies(): string[] {
    if (this.metadata?.dependencies) {
      return this.metadata.dependencies;
    }
    // Extract imports from code
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    const dependencies: string[] = [];
    let match;
    
    while ((match = importRegex.exec(this.code)) !== null) {
      const dep = match[1];
      if (!dep.startsWith('.') && !dep.startsWith('/')) {
        dependencies.push(dep);
      }
    }
    
    return Array.from(new Set(dependencies));
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      code: this.code,
      propsSchema: this.propsSchema,
      description: this.description,
      examples: this.examples,
      tags: this.tags,
      metadata: this.metadata,
      version: this.version,
      ownerId: this.ownerId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      usageCount: this.usageCount,
      lastUsedAt: this.lastUsedAt?.toISOString(),
    };
  }

  public static fromJSON(data: any): Component {
    return new Component(
      data.id,
      data.name,
      data.type,
      data.code,
      data.propsSchema,
      data.description,
      data.examples,
      data.tags || [],
      data.metadata,
      data.version || '1.0.0',
      data.ownerId,
      new Date(data.createdAt),
      new Date(data.updatedAt),
      data.usageCount || 0,
      data.lastUsedAt ? new Date(data.lastUsedAt) : undefined
    );
  }
}
