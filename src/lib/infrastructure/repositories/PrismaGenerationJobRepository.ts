import { PrismaClient } from '@prisma/client';
import { GenerationJob } from '../../domain/entities/GenerationJob';
import { IGenerationJobRepository } from '../../domain/repositories/IGenerationJobRepository';
import { GenerationStatus } from '@/types';

export class PrismaGenerationJobRepository implements IGenerationJobRepository {
  constructor(private prisma: PrismaClient) {}

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
    };

    const updated = await this.prisma.generationLog.update({
      where: { id: job.id },
      data,
    });

    return this.mapToEntity(updated);
  }

  async findByStatus(status: GenerationStatus): Promise<GenerationJob[]> {
    const records = await this.prisma.generationLog.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(record => this.mapToEntity(record));
  }

  async findRecent(limit: number = 10): Promise<GenerationJob[]> {
    const records = await this.prisma.generationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map(record => this.mapToEntity(record));
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.generationLog.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
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
          in: [GenerationStatus.COMPLETED, GenerationStatus.FAILED],
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

    return job;
  }
}
