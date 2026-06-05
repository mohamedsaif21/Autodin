import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { getPostStatus } from '@/lib/supabaseAdmin';

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

function readPosts(): ScheduledPost[] {
  if (!fs.existsSync(POSTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
}

function requiredEnv() {
  const env = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    APP_URL: process.env.APP_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return { env, missing };
}

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function generatedCaption(post: ScheduledPost) {
  const occasion = post.occasion || post.title;
  return `Celebrating ${occasion}!\n\nWishing everyone a wonderful ${occasion}. May this day bring joy and success to all.\n\n#${occasion.replace(/\s+/g, '')} #ATTEST #Celebration #LinkedIn`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET() {
  const { env, missing } = requiredEnv();

  if (missing.length > 0) {
    return Response.json(
      { ok: false, error: `Missing env: ${missing.join(', ')}` },
      { status: 500 }
    );
  }

  const appUrl = env.APP_URL!.replace(/\/$/, '');
  const posts = readPosts();
  const post = posts.find((item) => item.date === todayDate());

  if (!post) {
    return Response.json(
      { ok: false, error: "No scheduled post found for today" },
      { status: 404 }
    );
  }

  const status = await getPostStatus(post.id);

  if (status?.status === 'posted') {
    return Response.json({
      ok: true,
      message: "Today's scheduled post is already posted"
    });
  }

  const caption = generatedCaption(post);
  const posterUrl = `${appUrl}${post.posterPath}`;
  const approveUrl = `${appUrl}/api/scheduled/approve?id=${encodeURIComponent(post.id)}&secret=${encodeURIComponent(env.CRON_SECRET!)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2>Today's scheduled post is ready</h2>
      <p><strong>Title:</strong> ${escapeHtml(post.title)}</p>
      <p><strong>Date and time:</strong> ${escapeHtml(post.date)} at ${escapeHtml(post.time)}</p>
      <p><strong>Poster preview image:</strong></p>
      <img src="${escapeHtml(posterUrl)}" alt="${escapeHtml(post.title)}" style="max-width: 480px; width: 100%; height: auto; border-radius: 8px;" />
      <p><strong>Generated caption:</strong></p>
      <p style="white-space: pre-line;">${escapeHtml(caption)}</p>
      <p>
        <a href="${escapeHtml(approveUrl)}" style="display: inline-block; padding: 12px 18px; background: #0077b5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700;">
          Approve post
        </a>
      </p>
    </div>
  `;

  const text = [
    "Today's scheduled post is ready",
    "",
    `Title: ${post.title}`,
    `Date and time: ${post.date} at ${post.time}`,
    `Poster preview image: ${posterUrl}`,
    "",
    "Generated caption:",
    caption,
    "",
    `Approve: ${approveUrl}`,
  ].join('\n');

  try {
    const resend = new Resend(env.RESEND_API_KEY!);
    const result = await resend.emails.send({
      from: 'Autogram <onboarding@resend.dev>',
      to: env.ADMIN_EMAIL!,
      subject: "Today's scheduled post is ready",
      html,
      text,
    });

    if (result.error) {
      return Response.json(
        { ok: false, error: result.error.message },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      message: "Approval email sent"
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Resend failed' },
      { status: 500 }
    );
  }
}
