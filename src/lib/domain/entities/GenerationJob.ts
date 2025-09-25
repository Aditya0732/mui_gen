import { GenerationRequest, GenerationResponse, GenerationStatus } from '@/types';

export class GenerationJob {
  constructor(
    public readonly id: string,
    public readonly request: GenerationRequest,
    public status: GenerationStatus = GenerationStatus.PENDING,
    public result?: GenerationResponse,
    public error?: Error,
    public readonly createdAt: Date = new Date(),
    public startedAt?: Date,
    public completedAt?: Date,
    public retryCount: number = 0,
    public readonly maxRetries: number = 2,
    public metadata?: Record<string, any>
  ) {
    this.validateRequest(request);
  }

  private validateRequest(request: GenerationRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error('Generation request must have a non-empty prompt');
    }
    if (request.prompt.length > 2000) {
      throw new Error('Prompt is too long (max 2000 characters)');
    }
  }

  public start(): void {
    if (this.status !== GenerationStatus.PENDING) {
      throw new Error(`Cannot start job in ${this.status} status`);
    }
    this.status = GenerationStatus.PROCESSING;
    this.startedAt = new Date();
  }

  public complete(result: GenerationResponse): void {
    if (this.status !== GenerationStatus.PROCESSING) {
      throw new Error(`Cannot complete job in ${this.status} status`);
    }
    this.status = GenerationStatus.SUCCESS;
    this.result = result;
    this.completedAt = new Date();
  }

  public fail(error: Error): void {
    if (this.status !== GenerationStatus.PROCESSING) {
      throw new Error(`Cannot fail job in ${this.status} status`);
    }
    this.status = GenerationStatus.FAILED;
    this.error = error;
    this.completedAt = new Date();
  }

  public partialComplete(result: GenerationResponse, error: Error): void {
    if (this.status !== GenerationStatus.PROCESSING) {
      throw new Error(`Cannot partially complete job in ${this.status} status`);
    }
    this.status = GenerationStatus.PARTIAL;
    this.result = result;
    this.error = error;
    this.completedAt = new Date();
  }

  public timeout(): void {
    if (this.status !== GenerationStatus.PROCESSING) {
      throw new Error(`Cannot timeout job in ${this.status} status`);
    }
    this.status = GenerationStatus.TIMEOUT;
    this.error = new Error('Generation job timed out');
    this.completedAt = new Date();
  }

  public rateLimit(): void {
    this.status = GenerationStatus.RATE_LIMITED;
    this.error = new Error('Rate limit exceeded');
    this.completedAt = new Date();
  }

  public canRetry(): boolean {
    return this.retryCount < this.maxRetries && 
           (this.status === GenerationStatus.FAILED || 
            this.status === GenerationStatus.TIMEOUT);
  }

  public retry(): void {
    if (!this.canRetry()) {
      throw new Error('Cannot retry job: max retries reached or job not in retryable state');
    }
    this.retryCount++;
    this.status = GenerationStatus.PENDING;
    this.error = undefined;
    this.startedAt = undefined;
    this.completedAt = undefined;
  }

  public getDuration(): number | null {
    if (!this.startedAt) return null;
    const endTime = this.completedAt || new Date();
    return endTime.getTime() - this.startedAt.getTime();
  }

  public isCompleted(): boolean {
    return [
      GenerationStatus.SUCCESS,
      GenerationStatus.FAILED,
      GenerationStatus.PARTIAL,
      GenerationStatus.TIMEOUT,
      GenerationStatus.RATE_LIMITED
    ].includes(this.status);
  }

  public isSuccessful(): boolean {
    return this.status === GenerationStatus.SUCCESS;
  }

  public hasPartialResult(): boolean {
    return this.status === GenerationStatus.PARTIAL && this.result !== undefined;
  }

  public getProgressPercentage(): number {
    switch (this.status) {
      case GenerationStatus.PENDING:
        return 0;
      case GenerationStatus.PROCESSING:
        return 50;
      case GenerationStatus.SUCCESS:
      case GenerationStatus.PARTIAL:
        return 100;
      case GenerationStatus.FAILED:
      case GenerationStatus.TIMEOUT:
      case GenerationStatus.RATE_LIMITED:
        return 0;
      default:
        return 0;
    }
  }

  public addMetadata(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }

  public getMetadata(key: string): any {
    return this.metadata?.[key];
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      request: this.request,
      status: this.status,
      result: this.result,
      error: this.error ? {
        name: this.error.name,
        message: this.error.message,
        stack: this.error.stack,
      } : undefined,
      createdAt: this.createdAt.toISOString(),
      startedAt: this.startedAt?.toISOString(),
      completedAt: this.completedAt?.toISOString(),
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      metadata: this.metadata,
    };
  }

  public static fromJSON(data: any): GenerationJob {
    const job = new GenerationJob(
      data.id,
      data.request,
      data.status,
      data.result,
      data.error ? new Error(data.error.message) : undefined,
      new Date(data.createdAt),
      data.startedAt ? new Date(data.startedAt) : undefined,
      data.completedAt ? new Date(data.completedAt) : undefined,
      data.retryCount || 0,
      data.maxRetries || 2,
      data.metadata
    );

    // Restore error stack if available
    if (data.error && job.error) {
      job.error.name = data.error.name;
      job.error.stack = data.error.stack;
    }

    return job;
  }
}
