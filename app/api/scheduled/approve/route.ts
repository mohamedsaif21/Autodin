import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { LinkedInPostError, publishToLinkedIn } from '@/lib/linkedin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ScheduledPost {
  id: string;
  title: string;
  date: string;
  time: string;
  posterPath: string;
  occasion?: string;
}

const POSTS_FILE = path.join(process.cwd(), 'data', 'scheduled-posts.json');
const STATUS_FILE = path.join(process.cwd(), 'data', 'post-status.json');

function readPosts(): ScheduledPost[] {
  if (!fs.existsSync(POSTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
}

function readStatus(): Record<string, any> {
  if (!fs.existsSync(STATUS_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
}

function writeStatus(status: Record<string, any>) {
  const dir = path.dirname(STATUS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

function generatedCaption(post: ScheduledPost) {
  const occasion = post.occasion || post.title;
  return `Celebrating ${occasion}!\n\nWishing everyone a wonderful ${occasion}. May this day bring joy and success to all.\n\n#${occasion.replace(/\s+/g, '')} #ATTEST #Celebration #LinkedIn`;
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const secret = request.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return Response.json(
        { ok: false, error: 'Missing env: CRON_SECRET' },
        { status: 500 }
      );
    }

    if (!id) {
      return Response.json(
        { ok: false, error: 'Missing id search param' },
        { status: 400 }
      );
    }

    if (!secret || secret !== cronSecret) {
      return Response.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const posts = readPosts();
    const post = posts.find((item) => item.id === id);

    if (!post) {
      return Response.json(
        { ok: false, error: 'Scheduled post not found' },
        { status: 404 }
      );
    }

    const { postId: linkedinPostId } = await publishToLinkedIn({
      imageUrl: post.posterPath,
      caption: generatedCaption(post),
    });

    const statusMap = readStatus();
    statusMap[post.id] = {
      status: 'posted',
      postedAt: new Date().toISOString(),
      linkedinPostId: linkedinPostId || null,
    };
    writeStatus(statusMap);

    return Response.json({
      ok: true,
      message: 'Post approved and published successfully',
    });
  } catch (error) {
    console.error('Scheduled approve error:', error);

    if (error instanceof LinkedInPostError) {
      return Response.json(
        { ok: false, error: error.message, details: error.payload },
        { status: error.statusCode }
      );
    }

    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Approval failed' },
      { status: 500 }
    );
  }
}
