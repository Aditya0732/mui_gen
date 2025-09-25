import { GenerationJob } from '../entities/GenerationJob';
import { GenerationStatus } from '@/types';

export interface IGenerationJobRepository {
  // Basic CRUD operations
  create(job: GenerationJob): Promise<GenerationJob>;
  findById(id: string): Promise<GenerationJob | null>;
  update(job: GenerationJob): Promise<GenerationJob>;
  delete(id: string): Promise<void>;

  // Query operations
  findAll(options?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    jobs: GenerationJob[];
    total: number;
  }>;

  findByStatus(
    status: GenerationStatus,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    jobs: GenerationJob[];
    total: number;
  }>;

  findByUserId(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    jobs: GenerationJob[];
    total: number;
  }>;

  findPendingJobs(limit?: number): Promise<GenerationJob[]>;
  findProcessingJobs(): Promise<GenerationJob[]>;
  findRetryableJobs(limit?: number): Promise<GenerationJob[]>;

  // Queue operations
  getNextPendingJob(): Promise<GenerationJob | null>;
  markAsProcessing(id: string): Promise<void>;
  markAsCompleted(id: string, result: any): Promise<void>;
  markAsFailed(id: string, error: Error): Promise<void>;

  // Cleanup operations
  deleteCompletedJobs(olderThanDays: number): Promise<number>;
  deleteFailedJobs(olderThanDays: number): Promise<number>;
  
  // Statistics
  getJobStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    retryable: number;
  }>;

  getJobMetrics(fromDate?: Date, toDate?: Date): Promise<{
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    averageProcessingTime: number;
    successRate: number;
  }>;

  // Monitoring
  findStuckJobs(timeoutMinutes: number): Promise<GenerationJob[]>;
  findJobsOlderThan(hours: number): Promise<GenerationJob[]>;
  
  // Bulk operations
  deleteMany(ids: string[]): Promise<void>;
  updateStatus(ids: string[], status: GenerationStatus): Promise<void>;
}
