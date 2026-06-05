'use client';

interface TemplatePreview {
  bg: string;
  text: string;
  accent: string;
}

interface Props {
  imageUrl?: string;
  caption?: string;
  loading?: boolean;
  posterTitle?: string;
  imagePrompt?: string;
  loadingMessage?: string;
  templatePreview?: TemplatePreview;
  templateLabel?: string;
}

export default function PosterPreview({
  imageUrl,
  caption,
  loading,
  posterTitle,
  imagePrompt,
  loadingMessage,
  templatePreview,
  templateLabel,
}: Props) {
  return (
    <div>
      {/* Poster box — 1:1 ratio */}
      <div style={{
        width: '100%', aspectRatio: '1/1',
        borderRadius: 14, overflow: 'hidden',
        position: 'relative', border: '1px solid #1a1a2e',
        background: templatePreview?.bg || '#0a0a14',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {loading && (
          <div style={{ textAlign: 'center', zIndex: 2 }}>
            <div style={{
              width: 40, height: 40,
              border: '3px solid rgba(255,255,255,0.1)',
              borderTop: '3px solid #4f46e5',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              margin: '0 auto 14px',
            }} />
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
              {loadingMessage || 'Rendering poster...'}
            </div>
          </div>
        )}

        {!loading && imageUrl && (
          <img
            src={imageUrl}
            alt="Generated poster"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}

        {!loading && !imageUrl && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            {templatePreview ? (
              <>
                {/* Template colour preview */}
                <div style={{
                  width: 64, height: 64, borderRadius: 12, margin: '0 auto 14px',
                  background: templatePreview.accent,
                  opacity: 0.8,
                }} />
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: templatePreview.text === '#fff' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)',
                }}>
                  {templateLabel} template
                </div>
                <div style={{
                  fontSize: 12, marginTop: 6,
                  color: templatePreview.text === '#fff' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
                }}>
                  Enter your idea and click Generate
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 10, opacity: 0.2 }}>🖼</div>
                <div style={{ color: '#333', fontSize: 13 }}>Poster preview</div>
              </>
            )}
          </div>
        )}

        {/* LinkedIn badge overlay when image present */}
        {!loading && imageUrl && (
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            borderRadius: 6, padding: '4px 10px',
            fontSize: 11, color: 'rgba(255,255,255,0.7)',
            fontWeight: 600, letterSpacing: '0.04em',
          }}>
            1080 × 1080
          </div>
        )}
      </div>

      {/* Download button when image is ready */}
      {imageUrl && !loading && (
        <a
          href={imageUrl}
          download
          style={{
            display: 'block', textAlign: 'center',
            marginTop: 10, padding: '8px',
            borderRadius: 8, border: '1px solid #1a1a2e',
            color: '#555', fontSize: 12, textDecoration: 'none',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLElement).style.borderColor = '#4f46e5';
            (e.target as HTMLElement).style.color = '#a5b4fc';
          }}
          onMouseLeave={e => {
            (e.target as HTMLElement).style.borderColor = '#1a1a2e';
            (e.target as HTMLElement).style.color = '#555';
          }}
        >
          ⬇ Download PNG
        </a>
      )}

      {/* Caption card */}
      {caption && !loading && (
        <div style={{
          marginTop: 14, background: '#0a0a14',
          border: '1px solid #1a1a2e', borderRadius: 12, padding: 18,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: '#444',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>
            LinkedIn Caption
          </div>
          <p style={{
            fontSize: 13, color: '#bbb', lineHeight: 1.7, margin: 0,
            whiteSpace: 'pre-wrap',
          }}>
            {caption}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => navigator.clipboard.writeText(caption)}
              style={{
                padding: '6px 14px', borderRadius: 6,
                background: 'transparent', border: '1px solid #1a1a2e',
                color: '#555', fontSize: 12, cursor: 'pointer',
              }}>
              📋 Copy
            </button>
            <span style={{ fontSize: 12, color: '#333', alignSelf: 'center' }}>
              {caption.length} chars
            </span>
          </div>
        </div>
      )}

      {/* Extra debug info (used by Calendar mode) */}
      {!loading && (posterTitle || imagePrompt) && (
        <div style={{
          marginTop: 10, background: '#070710',
          border: '1px solid #141428', borderRadius: 12, padding: 14,
        }}>
          {posterTitle && (
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
              <span style={{ color: '#444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Poster Title
              </span>{' '}
              <span style={{ color: '#888', fontWeight: 600 }}>{posterTitle}</span>
            </div>
          )}
          {imagePrompt && (
            <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>
              <span style={{ color: '#444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Image Prompt
              </span>{' '}
              <span style={{ color: '#777' }}>{imagePrompt}</span>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}