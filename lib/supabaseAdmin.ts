import { createClient } from '@supabase/supabase-js';

export interface PostStatusRecord {
  postId: string;
  status: string;
  postedAt: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  linkedinPostId: string | null;
  updatedAt: string | null;
}

interface PostStatusRow {
  id: string;
  status: string;
  posted_at: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  updated_at: string | null;
}

const TABLE_NAME = 'scheduled_post_status';

function requiredSupabaseEnv() {
  const missing = [];
  if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    throw new Error(`Missing Supabase env: ${missing.join(', ')}`);
  }
}

function supabaseAdmin() {
  requiredSupabaseEnv();

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function normalizePostStatus(row: PostStatusRow | null): PostStatusRecord | null {
  if (!row) return null;

  return {
    postId: row.id,
    status: row.status,
    postedAt: row.posted_at,
    instagramUrl: row.instagram_url,
    linkedinUrl: row.linkedin_url,
    linkedinPostId: row.linkedin_url,
    updatedAt: row.updated_at,
  };
}

export async function getPostStatus(postId: string) {
  const { data, error } = await supabaseAdmin()
    .from(TABLE_NAME)
    .select('id,status,posted_at,instagram_url,linkedin_url,updated_at')
    .eq('id', postId)
    .maybeSingle<PostStatusRow>();

  if (error) {
    throw new Error(`Failed to read post status from Supabase: ${error.message}`);
  }

  return normalizePostStatus(data);
}

export async function upsertPostStatus(
  postId: string,
  status: string,
  data: {
    postedAt?: string | null;
    instagramUrl?: string | null;
    linkedinUrl?: string | null;
  } = {}
) {
  const existing = await getPostStatus(postId);
  const now = new Date().toISOString();

  const { data: row, error } = await supabaseAdmin()
    .from(TABLE_NAME)
    .upsert(
      {
        id: postId,
        status,
        posted_at: data.postedAt ?? existing?.postedAt ?? null,
        instagram_url: data.instagramUrl ?? existing?.instagramUrl ?? null,
        linkedin_url: data.linkedinUrl ?? existing?.linkedinUrl ?? null,
        updated_at: now,
      },
      { onConflict: 'id' }
    )
    .select('id,status,posted_at,instagram_url,linkedin_url,updated_at')
    .single<PostStatusRow>();

  if (error) {
    throw new Error(`Failed to save post status to Supabase: ${error.message}`);
  }

  return normalizePostStatus(row);
}

export async function markPostPosted(
  postId: string,
  instagramUrl?: string | null,
  linkedinUrl?: string | null
) {
  return upsertPostStatus(postId, 'posted', {
    postedAt: new Date().toISOString(),
    instagramUrl: instagramUrl || null,
    linkedinUrl: linkedinUrl || null,
  });
}
