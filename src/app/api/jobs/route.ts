import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jobQueue } from '@/lib/db/schema';
import { authClient } from '@/lib/auth/client';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // Get the current user session
    const session = await authClient.getSession();

    if (!session?.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.session.userId;

    // Get all jobs for the user
    const jobs = await db
      .select()
      .from(jobQueue)
      .where(sql`${jobQueue.userId} = ${userId}`)
      .orderBy(desc(jobQueue.createdAt));

    return NextResponse.json({
      jobs: jobs,
      total: jobs.length,
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

import { sql, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Get the current user session
    const session = await authClient.getSession();

    if (!session?.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.session.userId;

    // Parse request body
    const body = await request.json();

    const { targetUrl, targetUsername, platform, searchType, entityId } = body;

    // Validate required fields
    if (!targetUrl) {
      return NextResponse.json(
        { error: 'targetUrl is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Create job in the queue
    const jobId = randomUUID();

    const newJob = await db.insert(jobQueue).values({
      id: jobId,
      userId: userId,
      entityId: entityId || null,
      targetUrl,
      targetUsername: targetUsername || null,
      platform: platform || null,
      searchType: searchType || 'username',
      status: 'queued',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      jobId: jobId,
      message: 'Job queued successfully',
      status: 'queued',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
