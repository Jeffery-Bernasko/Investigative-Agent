/**
 * Schema exports for the worker
 * Re-exports from the main app schema
 */

// Re-export job status enum values
export const jobStatusEnum = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type JobStatus = typeof jobStatusEnum[keyof typeof jobStatusEnum];

// Job type for the worker
export interface JobQueue {
  id: string;
  userId: string | null;
  entityId: number | null;
  targetUrl: string;
  targetUsername: string | null;
  platform: string | null;
  searchType: string | null;
  status: JobStatus;
  scrapedData: any;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewJobQueue {
  userId?: string;
  entityId?: number;
  targetUrl: string;
  targetUsername?: string;
  platform?: string;
  searchType?: string;
  maxRetries?: number;
}
