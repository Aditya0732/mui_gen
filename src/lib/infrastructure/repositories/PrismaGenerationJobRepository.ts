import { PrismaClient } from '@prisma/client';
import { GenerationJob } from '../../domain/entities/GenerationJob';
import { IGenerationJobRepository } from '../../domain/repositories/IGenerationJobRepository';
import { GenerationStatus } from '@/types';

export class PrismaGenerationJobRepository implements IGenerationJobRepository {
  constructor(private prisma: PrismaClient) {}
  findAll(options?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ jobs: GenerationJob[]; total: number }> {
    throw new Error('Method not implemented.');
  }
  findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ jobs: GenerationJob[]; total: number }> {
    throw new Error('Method not implemented.');
  }
  findPendingJobs(limit?: number): Promise<GenerationJob[]> {
    throw new Error('Method not implemented.');
  }
  findProcessingJobs(): Promise<GenerationJob[]> {
    throw new Error('Method not implemented.');
  }
  findRetryableJobs(limit?: number): Promise<GenerationJob[]> {
    throw new Error('Method not implemented.');
  }
  getNextPendingJob(): Promise<GenerationJob | null> {
    throw new Error('Method not implemented.');
  }
  markAsProcessing(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  markAsCompleted(id: string, result: any): Promise<void> {
    throw new Error('Method not implemented.');
  }
  markAsFailed(id: string, error: Error): Promise<void> {
    throw new Error('Method not implemented.');
  }
  deleteCompletedJobs(olderThanDays: number): Promise<number> {
    throw new Error('Method not implemented.');
  }
  deleteFailedJobs(olderThanDays: number): Promise<number> {
    throw new Error('Method not implemented.');
  }
  getJobStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    retryable: number;
  }> {
    throw new Error('Method not implemented.');
  }
  getJobMetrics(
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    averageProcessingTime: number;
    successRate: number;
  }> {
    throw new Error('Method not implemented.');
  }
  findStuckJobs(timeoutMinutes: number): Promise<GenerationJob[]> {
    throw new Error('Method not implemented.');
  }
  findJobsOlderThan(hours: number): Promise<GenerationJob[]> {
    throw new Error('Method not implemented.');
  }
  deleteMany(ids: string[]): Promise<void> {
    throw new Error('Method not implemented.');
  }
  updateStatus(ids: string[], status: GenerationStatus): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async create(job: GenerationJob): Promise<GenerationJob> {
    const data = {
      id: job.id,
      prompt: job.request.prompt,
      componentType:
        (job.request as any).componentType ||
        (job.request as any).preferredType ||
        'MUIButton',
      requirements: JSON.stringify((job.request as any).requirements || {}),
      options: JSON.stringify(job.request.options || {}),
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      result: job.result ? JSON.stringify(job.result) : null,
      error: job.error
        ? JSON.stringify({
            message: job.error.message,
            stack: job.error.stack,
            name: job.error.name,
          })
        : null,
      retryCount: job.retryCount,
      metadata: JSON.stringify(job.metadata || {}),
      componentId: job.componentId,
    };

    const created = await this.prisma.generationLog.create({
      data,
    });

    return this.mapToEntity(created);
  }

  async findById(id: string): Promise<GenerationJob | null> {
    const record = await this.prisma.generationLog.findUnique({
      where: { id },
    });

    return record ? this.mapToEntity(record) : null;
  }

  async update(job: GenerationJob): Promise<GenerationJob> {
    const data = {
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      result: job.result ? JSON.stringify(job.result) : null,
      error: job.error
        ? JSON.stringify({
            message: job.error.message,
            stack: job.error.stack,
            name: job.error.name,
          })
        : null,
      retryCount: job.retryCount,
      metadata: JSON.stringify(job.metadata || {}),
      componentId: job.componentId,
    };

    const updated = await this.prisma.generationLog.update({
      where: { id: job.id },
      data,
    });

    return this.mapToEntity(updated);
  }

  async findByStatus(
    status: GenerationStatus
  ): Promise<{ jobs: GenerationJob[]; total: number }> {
    const records = await this.prisma.generationLog.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });

    return {
      jobs: records.map(record => this.mapToEntity(record)),
      total: records.length,
    };
  }

  async findRecent(limit: number = 10): Promise<GenerationJob[]> {
    const records = await this.prisma.generationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map(record => this.mapToEntity(record));
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.generationLog.delete({
        where: { id },
      });
    } catch (error) {
      throw new Error('Failed to delete generation job');
    }
  }

  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.generationLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: {
          in: [GenerationStatus.SUCCESS, GenerationStatus.FAILED],
        },
      },
    });

    return result.count;
  }

  private mapToEntity(record: any): GenerationJob {
    const job = new GenerationJob(record.id, {
      prompt: record.prompt,
      preferredType: record.componentType,
      context:
        (record.requirements ? JSON.parse(record.requirements) : undefined) ||
        {},
      options: record.options ? JSON.parse(record.options) : undefined,
    });

    // Set internal properties
    (job as any).status = record.status;
    (job as any).createdAt = record.createdAt;
    (job as any).startedAt = record.startedAt;
    (job as any).completedAt = record.completedAt;
    (job as any).result = record.result ? JSON.parse(record.result) : null;
    (job as any).error = record.error ? JSON.parse(record.error) : null;
    (job as any).retryCount = record.retryCount;
    (job as any).metadata = record.metadata ? JSON.parse(record.metadata) : {};
    job.componentId = record.componentId;

    return job;
  }
}
