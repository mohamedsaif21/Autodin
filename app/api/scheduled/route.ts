import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getPostStatus, markPostPosted } from '@/lib/supabaseAdmin';

const POSTS_FILE = path.join(process.cwd(), 'data', 'scheduled-posts.json');

// Read scheduled posts from JSON
function readPosts(): any[] {
  if (!fs.existsSync(POSTS_FILE)) return [];
  const raw = fs.readFileSync(POSTS_FILE, 'utf-8');
  return JSON.parse(raw);
}

// Compute live status for each post
function computeStatus(post: any, statusMap: Record<string, any>): string {
  if (statusMap[post.id]?.status === 'posted') return 'posted';

  const now = new Date();
  const postDate = new Date(`${post.date}T${post.time}:00`);
  const todayStr = now.toISOString().split('T')[0];

  if (post.date === todayStr) return 'today';
  if (postDate < now) return 'expired';
  return 'pending';
}

// GET — return all posts with live status
export async function GET() {
  try {
    const posts = readPosts();
    const statuses = await Promise.all(
      posts.map(async (post) => [post.id, await getPostStatus(post.id)] as const)
    );
    const statusMap = Object.fromEntries(statuses);
    const today = new Date().toISOString().split('T')[0];

    const enriched = posts.map(p => ({
      ...p,
      liveStatus: computeStatus(p, statusMap),
      postedAt: statusMap[p.id]?.postedAt || null,
      linkedinPostId: statusMap[p.id]?.linkedinPostId || statusMap[p.id]?.linkedinUrl || null,
    }));

    // Sort: today first, then pending by date, then posted, then expired
    enriched.sort((a, b) => {
      const order = { today: 0, pending: 1, posted: 2, expired: 3 };
      const diff = (order[a.liveStatus as keyof typeof order] ?? 4) -
                   (order[b.liveStatus as keyof typeof order] ?? 4);
      if (diff !== 0) return diff;
      return a.date.localeCompare(b.date);
    });

    const todayPost = enriched.find(p => p.liveStatus === 'today') || null;
    return NextResponse.json({ posts: enriched, todayPost, today });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/scheduled — generate caption from poster using Gemini vision
export async function POST(req: NextRequest) {
  const { postId } = await req.json();

  try {
    const posts = readPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    // Read the poster image
    const imagePath = path.join(process.cwd(), 'public', post.posterPath);
    if (!fs.existsSync(imagePath)) {
      return NextResponse.json({ error: `Poster file not found: ${post.posterPath}` }, { status: 404 });
    }

    // Check if API key is valid
    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidKey = apiKey && apiKey.startsWith('AIza');

    if (!hasValidKey) {
      // Fallback caption without Gemini
      console.warn('Invalid Gemini API key. Using fallback caption for scheduled post.');
      return NextResponse.json({
        success: true,
        postId,
        posterPath: post.posterPath,
        title: post.title,
        extractedText: post.title,
        occasion: post.occasion,
        caption: `Celebrating ${post.occasion}! 🎉\n\nWishing everyone a wonderful ${post.occasion}. May this day bring joy and success to all.\n\n#${post.occasion.replace(/\s+/g, '')} #ATTEST #Celebration #LinkedIn`,
        fallback: true
      });
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = post.posterPath.endsWith('.png') ? 'image/png' : 'image/jpeg';

    // Gemini Vision — extract text from poster and generate caption
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

    const result = await model.generateContent([
      {
        inlineData: { data: base64Image, mimeType },
      },
      {
        text: `You are a LinkedIn content expert. Look at this poster image carefully.

1. Extract all visible text from the poster
2. Understand the occasion/event it represents
3. Write a professional LinkedIn caption for this poster

Return ONLY valid JSON, no markdown:
{
  "extractedText": "all text visible in the poster",
  "occasion": "what this poster is about",
  "caption": "professional LinkedIn caption, 3-4 sentences, warm and engaging tone, end with 4-5 relevant hashtags"
}`,
      },
    ]);

    const raw = result.response.text()
      .replace(/```json/g, '').replace(/```/g, '').trim();
    const geminiData = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      postId,
      posterPath: post.posterPath,
      title: post.title,
      ...geminiData,
    });

  } catch (err: any) {
    console.error('Scheduled POST error:', err);
    
    // Fallback on error
    const posts = readPosts();
    const post = posts.find(p => p.id === postId);
    return NextResponse.json({
      success: true,
      postId,
      posterPath: post?.posterPath,
      title: post?.title,
      extractedText: post?.title || '',
      occasion: post?.occasion || '',
      caption: `Celebrating ${post?.occasion}! 🎉\n\nWishing everyone a wonderful ${post?.occasion}. May this day bring joy and success to all.\n\n#${post?.occasion?.replace(/\s+/g, '')} #ATTEST #Celebration #LinkedIn`,
      fallback: true,
      error: err.message
    });
  }
}

// PATCH /api/scheduled — mark a post as posted
export async function PATCH(req: NextRequest) {
  const { postId, linkedinPostId } = await req.json();

  try {
    await markPostPosted(postId, null, linkedinPostId || null);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
