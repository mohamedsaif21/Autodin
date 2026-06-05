'use client';
import { useState, useEffect, useCallback } from 'react';

interface ScheduledPost {
  id: string;
  title: string;
  date: string;
  time: string;
  posterPath: string;
  liveStatus: 'today' | 'pending' | 'posted' | 'expired';
  postedAt: string | null;
  linkedinPostId: string | null;
}

interface GeneratedCaption {
  postId: string;
  posterPath: string;
  title: string;
  extractedText: string;
  occasion: string;
  caption: string;
}

type ModalStep = 'idle' | 'extracting' | 'review' | 'posting' | 'done';

const STATUS_STYLES = {
  today:   { bg: '#071a10', border: '#0d4a20', dot: '#22c55e', label: 'Post Today',  labelColor: '#22c55e' },
  pending: { bg: '#0a0a18', border: '#1a1a30', dot: '#4f46e5', label: 'Scheduled',   labelColor: '#4f46e5' },
  posted:  { bg: '#071016', border: '#0d3040', dot: '#38bdf8', label: 'Posted',      labelColor: '#38bdf8' },
  expired: { bg: '#180808', border: '#3a1010', dot: '#555',    label: 'Expired',     labelColor: '#555'    },
};

export default function ScheduledMode() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [todayPost, setTodayPost] = useState<ScheduledPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [activePost, setActivePost] = useState<ScheduledPost | null>(null);
  const [modalStep, setModalStep] = useState<ModalStep>('idle');
  const [generated, setGenerated] = useState<GeneratedCaption | null>(null);
  const [modalError, setModalError] = useState('');

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduled');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPosts(data.posts);
      setTodayPost(data.todayPost);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  // Auto-check on mount
  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Open modal for a post
  async function openPost(post: ScheduledPost) {
    setActivePost(post);
    setModalStep('extracting');
    setModalError('');
    setGenerated(null);

    try {
      const res = await fetch('/api/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setGenerated(data);
      setModalStep('review');
    } catch (e: any) {
      setModalError(e.message);
      setModalStep('review');
    }
  }

  // Post to LinkedIn
  async function handlePost() {
    if (!activePost || !generated) return;
    setModalStep('posting');
    setModalError('');

    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: activePost.posterPath,
          caption: generated.caption,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || JSON.stringify(data.details));

      // Mark as posted
      await fetch('/api/scheduled', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: activePost.id, linkedinPostId: data.postId }),
      });

      setModalStep('done');
      fetchPosts(); // Refresh list
    } catch (e: any) {
      setModalError('Post failed: ' + e.message);
      setModalStep('review');
    }
  }

  function closeModal() {
    setActivePost(null);
    setModalStep('idle');
    setGenerated(null);
    setModalError('');
  }

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div style={{ maxWidth: 1040 }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 28,
      }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
            Scheduled Posts
          </h2>
          <p style={{ color: '#444', fontSize: 14, margin: 0 }}>{today}</p>
        </div>
        <button onClick={fetchPosts} style={{
          padding: '8px 16px', borderRadius: 8,
          background: '#0c0c18', border: '1px solid #1a1a30',
          color: '#555', fontSize: 13, cursor: 'pointer',
        }}>
          🔄 Refresh
        </button>
      </div>

      {/* ── Today's post banner ── */}
      {todayPost && (
        <div style={{
          background: 'linear-gradient(135deg, #071a10, #0a2818)',
          border: '1px solid #0d4a20', borderRadius: 14,
          padding: '20px 24px', marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{ fontSize: 36 }}>📅</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Today's post is ready
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
              {todayPost.title}
            </div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 3 }}>
              Scheduled for {todayPost.time} · Click to preview and post
            </div>
          </div>
          <button onClick={() => openPost(todayPost)} style={{
            padding: '12px 24px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            📋 Preview & Post
          </button>
        </div>
      )}

      {error && (
        <div style={{
          background: '#1a0808', border: '1px solid #3a1010',
          borderRadius: 8, padding: '12px 16px', color: '#f87171',
          fontSize: 13, marginBottom: 20,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Posts grid ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#333' }}>
          <LoadingDots /> <div style={{ marginTop: 12, fontSize: 14 }}>Loading scheduled posts...</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onOpen={() => openPost(post)}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {activePost && (
        <PostModal
          post={activePost}
          step={modalStep}
          generated={generated}
          error={modalError}
          onPost={handlePost}
          onClose={closeModal}
          onEditCaption={(caption) => setGenerated(prev => prev ? { ...prev, caption } : null)}
        />
      )}
    </div>
  );
}

// ── Post Card ──────────────────────────────────────────────────────────────

function PostCard({ post, onOpen }: { post: ScheduledPost; onOpen: () => void }) {
  const style = STATUS_STYLES[post.liveStatus];
  const isClickable = post.liveStatus === 'today' || post.liveStatus === 'pending';

  const formattedDate = new Date(post.date + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div style={{
      background: style.bg, border: `1px solid ${style.border}`,
      borderRadius: 12, overflow: 'hidden',
      opacity: post.liveStatus === 'expired' ? 0.55 : 1,
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: isClickable ? 'pointer' : 'default',
    }}
      onClick={isClickable ? onOpen : undefined}
      onMouseEnter={e => {
        if (isClickable) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${style.border}66`;
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Poster thumbnail */}
      <div style={{
        width: '100%', aspectRatio: '1/1',
        background: '#050510', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <img
          src={post.posterPath}
          alt={post.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.style.background = '#0c0c20';
          }}
        />
        {/* Status badge */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          borderRadius: 6, padding: '4px 10px',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: style.dot,
            boxShadow: post.liveStatus === 'today' ? `0 0 8px ${style.dot}` : 'none',
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: style.labelColor }}>
            {style.label}
          </span>
        </div>

        {/* Posted overlay */}
        {post.liveStatus === 'posted' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              background: 'rgba(56,189,248,0.15)',
              border: '2px solid #38bdf8',
              borderRadius: 50, width: 56, height: 56,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>✓</div>
          </div>
        )}

        {/* Expired overlay */}
        {post.liveStatus === 'expired' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32,
          }}>⏰</div>
        )}
      </div>

      {/* Card info */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e8e8f0', marginBottom: 4 }}>
          {post.title}
        </div>
        <div style={{ fontSize: 12, color: '#444' }}>{formattedDate} · {post.time}</div>
        {post.postedAt && (
          <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 4 }}>
            ✓ Posted {new Date(post.postedAt).toLocaleDateString('en-IN')}
          </div>
        )}
        {isClickable && (
          <div style={{
            marginTop: 12, padding: '7px 0',
            borderTop: `1px solid ${style.border}`,
            fontSize: 12, color: style.labelColor, fontWeight: 600,
          }}>
            {post.liveStatus === 'today' ? '→ Click to post today' : '→ Click to preview'}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Post Modal ─────────────────────────────────────────────────────────────

function PostModal({ post, step, generated, error, onPost, onClose, onEditCaption }: {
  post: ScheduledPost;
  step: ModalStep;
  generated: GeneratedCaption | null;
  error: string;
  onPost: () => void;
  onClose: () => void;
  onEditCaption: (caption: string) => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#0a0a16', border: '1px solid #1a1a30',
        borderRadius: 16, width: '100%', maxWidth: 820,
        maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Modal header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #111120',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{post.title}</div>
            <div style={{ fontSize: 12, color: '#444', marginTop: 3 }}>
              {new Date(post.date + 'T00:00:00').toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })} · {post.time}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid #1a1a30',
            background: 'transparent', color: '#555', fontSize: 18,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Modal body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

          {step === 'extracting' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <LoadingDots />
              <div style={{ color: '#555', fontSize: 14, marginTop: 14 }}>
                🧠 Gemini is reading your poster and writing the caption...
              </div>
              <div style={{ color: '#333', fontSize: 12, marginTop: 6 }}>
                Extracting text → understanding context → generating LinkedIn caption
              </div>
            </div>
          )}

          {(step === 'review' || step === 'posting' || step === 'done') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Left: poster */}
              <div>
                <SectionLabel>Poster</SectionLabel>
                <div style={{
                  borderRadius: 10, overflow: 'hidden',
                  border: '1px solid #1a1a30', aspectRatio: '1/1',
                  background: '#050510',
                }}>
                  <img src={post.posterPath} alt={post.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>

                {generated?.extractedText && (
                  <div style={{
                    marginTop: 12, background: '#070710',
                    border: '1px solid #111120', borderRadius: 8, padding: 12,
                  }}>
                    <div style={{ fontSize: 10, color: '#333', textTransform: 'uppercase',
                      letterSpacing: '0.07em', marginBottom: 6 }}>
                      Text extracted from poster
                    </div>
                    <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                      {generated.extractedText}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: caption */}
              <div>
                <SectionLabel>AI-Generated LinkedIn Caption</SectionLabel>
                {generated?.occasion && (
                  <div style={{
                    fontSize: 12, color: '#4f46e5', marginBottom: 10,
                    background: '#0a0a20', border: '1px solid #1a1a35',
                    borderRadius: 6, padding: '6px 10px',
                  }}>
                    📌 Occasion detected: <strong>{generated.occasion}</strong>
                  </div>
                )}

                {error && (
                  <div style={{
                    background: '#1a0808', border: '1px solid #3a1010',
                    borderRadius: 8, padding: 12, color: '#f87171',
                    fontSize: 13, marginBottom: 12,
                  }}>⚠️ {error}</div>
                )}

                <textarea
                  value={generated?.caption || ''}
                  onChange={e => onEditCaption(e.target.value)}
                  rows={10}
                  style={{
                    width: '100%', background: '#070710',
                    border: '1px solid #1a1a30', borderRadius: 10,
                    padding: '13px 15px', color: '#e0e0f0',
                    fontSize: 13, lineHeight: 1.7, resize: 'vertical',
                    boxSizing: 'border-box', outline: 'none',
                  }}
                  placeholder={step === 'extracting' ? 'Generating...' : 'Caption will appear here'}
                />

                {generated?.caption && (
                  <div style={{ fontSize: 11, color: '#333', marginTop: 5, textAlign: 'right' }}>
                    {generated.caption.length} characters
                  </div>
                )}

                {step === 'done' && (
                  <div style={{
                    background: '#071510', border: '1px solid #0d4020',
                    borderRadius: 10, padding: 16, textAlign: 'center', marginTop: 12,
                  }}>
                    <div style={{ fontSize: 28 }}>✅</div>
                    <div style={{ fontWeight: 700, color: '#22c55e', marginTop: 6 }}>
                      Posted to LinkedIn!
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal footer */}
        {(step === 'review' || step === 'posting') && generated && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #111120',
            display: 'flex', gap: 12, justifyContent: 'flex-end',
          }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: 8,
              background: 'transparent', border: '1px solid #1a1a30',
              color: '#555', fontSize: 14, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button
              onClick={onPost}
              disabled={step === 'posting' || !generated.caption}
              style={{
                padding: '10px 28px', borderRadius: 8, border: 'none',
                background: step === 'posting'
                  ? '#001525'
                  : 'linear-gradient(135deg, #0077b5, #005885)',
                color: step === 'posting' ? '#38bdf8' : '#fff',
                fontSize: 14, fontWeight: 700,
                cursor: step === 'posting' ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
              {step === 'posting'
                ? <><LoadingDots color="#38bdf8" /> Posting...</>
                : '🔗 Post to LinkedIn'}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #111120',
            display: 'flex', justifyContent: 'flex-end',
          }}>
            <button onClick={onClose} style={{
              padding: '10px 28px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Setup instructions ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#444',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function LoadingDots({ color = '#4f46e5' }: { color?: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: 6, height: 6,
          borderRadius: '50%', background: color,
          animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
      <style>{`@keyframes bounce{0%,100%{transform:scale(0.6);opacity:0.4}50%{transform:scale(1);opacity:1}}`}</style>
    </span>
  );
}