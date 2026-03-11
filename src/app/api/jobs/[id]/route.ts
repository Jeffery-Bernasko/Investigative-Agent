import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jobQueue } from '@/lib/db/schema';
import { authClient } from '@/lib/auth/client';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    // Get the current user session
    const session = await authClient.getSession();

    if (!session?.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.session.userId;

    // Get the job
    const [job] = await db
      .select()
      .from(jobQueue)
      .where(eq(jobQueue.id, jobId));

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if the job belongs to the user
    if (job.userId !== userId) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Return job details
    return NextResponse.json({
      id: job.id,
      targetUrl: job.targetUrl,
      targetUsername: job.targetUsername,
      platform: job.platform,
      searchType: job.searchType,
      status: job.status,
      scrapedData: job.scrapedData,
      errorMessage: job.errorMessage,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });

  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}
