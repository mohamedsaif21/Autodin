'use client';
import { useState } from 'react';
import PosterPreview from './PosterPreview';

const TEMPLATES = [
  {
    id: 'bold',
    label: 'Bold Dark',
    emoji: '🌑',
    desc: 'Deep navy, dramatic diagonal accent',
    preview: { bg: 'linear-gradient(135deg, #0a0a1a, #0f0f2e)', text: '#fff', accent: '#4f46e5' },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    emoji: '📄',
    desc: 'Swiss editorial, off-white, gold accent',
    preview: { bg: '#f7f4ef', text: '#1a1a1a', accent: '#c8a96e' },
  },
  {
    id: 'festival',
    label: 'Festival',
    emoji: '🎉',
    desc: 'Saffron-coral gradient, celebration',
    preview: { bg: 'linear-gradient(135deg, #ff6b35, #ffcd3c)', text: '#fff', accent: '#fff' },
  },
  {
    id: 'editorial',
    label: 'Editorial',
    emoji: '📰',
    desc: 'Magazine cover, charcoal & crimson',
    preview: { bg: '#111', text: '#fff', accent: '#c41e3a' },
  },
  {
    id: 'neon',
    label: 'Neon',
    emoji: '⚡',
    desc: 'Electric dark, glowing grid, cyan',
    preview: { bg: 'linear-gradient(135deg, #050510, #0a0520)', text: '#fff', accent: '#00ffc8' },
  },
];

export default function ManualMode() {
  const [text, setText] = useState('');
  const [template, setTemplate] = useState('bold');
  const [brandName, setBrandName] = useState('ATTEST');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'preview' | 'posted'>('input');
  const [result, setResult] = useState<{
    caption: string; posterHeadline: string; posterSubtext: string;
    accentWord?: string; imageUrl?: string;
  } | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (!text.trim()) return;
    setLoading(true); setError('');
    try {
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type: 'manual' }),
      });
      if (!genRes.ok) throw new Error(`Generate API error: ${genRes.status}`);
      const genData = await genRes.json();
      if (genData.error && !genData.fallback) throw new Error(genData.error);

      const posterRes = await fetch('/api/poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePrompt: genData.imagePrompt,
        }),
      });
      const posterData = await posterRes.json().catch(() => ({}));
      if (!posterRes.ok) {
        throw new Error(posterData?.error || `Poster API error: ${posterRes.status}`);
      }
      if (posterData.error) throw new Error(posterData.error);

      setResult({ ...genData, imageUrl: posterData.imageUrl });
      setStep('preview');
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Check your API keys.');
    }
    setLoading(false);
  }

  async function handlePost() {
    if (!result) return;
    setPosting(true); setError('');
    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: result.imageUrl, caption: result.caption }),
      });
      const data = await res.json();
      if (data.success) setStep('posted');
      else throw new Error(data.error || JSON.stringify(data.details));
    } catch (e: any) {
      setError('Post failed: ' + e.message);
    }
    setPosting(false);
  }

  async function handleRegenerate() {
    if (!result) return;
    setLoading(true); setError('');
    try {
      // Get fresh imagePrompt from generate API
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type: 'manual' }),
      });
      const genData = await genRes.json();
      
      const posterRes = await fetch('/api/poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePrompt: genData.imagePrompt || result.imageUrl,
        }),
      });
      const posterData = await posterRes.json().catch(() => ({}));
      if (!posterRes.ok) throw new Error(posterData?.error || `Poster API error: ${posterRes.status}`);
      setResult(prev => prev ? { ...prev, imageUrl: posterData.imageUrl } : null);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  function handleReset() {
    setStep('input'); setText(''); setResult(null); setError('');
  }

  const selectedTemplate = TEMPLATES.find(t => t.id === template)!;

  return (
    <div style={{ maxWidth: 1000 }}>
      {step === 'posted' ? (
        <SuccessCard onReset={handleReset} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 40 }}>
          {/* ── Left panel ── */}
          <div>
            <SectionLabel>Your idea</SectionLabel>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="e.g. Share a motivational quote about consistency and discipline for professionals"
              rows={4}
              style={{
                width: '100%', background: '#0d0d1a', border: '1px solid #1e1e3a',
                borderRadius: 10, padding: '14px 16px', color: '#fff',
                fontSize: 14, resize: 'vertical', boxSizing: 'border-box',
                outline: 'none', lineHeight: 1.6, marginBottom: 6,
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e => e.target.style.borderColor = '#1e1e3a'}
            />
            <p style={{ color: '#444', fontSize: 12, margin: '0 0 20px', lineHeight: 1.5 }}>
              Be specific — mention tone, topic, audience for best results.
            </p>

            <SectionLabel>Brand / Page name</SectionLabel>
            <input
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="ATTEST"
              style={{
                width: '100%', background: '#0d0d1a', border: '1px solid #1e1e3a',
                borderRadius: 10, padding: '12px 16px', color: '#fff',
                fontSize: 14, boxSizing: 'border-box', outline: 'none',
                marginBottom: 20,
              }}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e => e.target.style.borderColor = '#1e1e3a'}
            />

            <SectionLabel>Poster template</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {TEMPLATES.map(t => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={template === t.id}
                  onClick={() => {
                    setTemplate(t.id);
                    if (step === 'preview') handleRegenerate();
                  }}
                />
              ))}
            </div>

            {error && <ErrorBox message={error} />}

            {step === 'input' && (
              <button
                onClick={handleGenerate}
                disabled={loading || !text.trim()}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 10,
                  background: loading || !text.trim()
                    ? '#1a1a2e'
                    : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  border: 'none', color: loading || !text.trim() ? '#444' : '#fff',
                  fontSize: 15, fontWeight: 700, cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', letterSpacing: '0.02em',
                }}>
                {loading ? '⏳  Generating...' : '✨  Generate Poster'}
              </button>
            )}

            {step === 'preview' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handlePost} disabled={posting} style={{
                  flex: 1, padding: '14px 20px', borderRadius: 10,
                  background: posting ? '#1a1a2e' : 'linear-gradient(135deg, #0077b5, #005885)',
                  border: 'none', color: posting ? '#444' : '#fff',
                  fontSize: 15, fontWeight: 700, cursor: posting ? 'not-allowed' : 'pointer',
                }}>
                  {posting ? '📤  Posting...' : '🔗  Post to LinkedIn'}
                </button>
                <button onClick={handleReset} style={{
                  padding: '14px 18px', borderRadius: 10,
                  background: 'transparent', border: '1px solid #1e1e3a',
                  color: '#666', fontSize: 14, cursor: 'pointer',
                }}>
                  ↺
                </button>
              </div>
            )}
          </div>

          {/* ── Right panel: preview ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <SectionLabel style={{ margin: 0 }}>Preview</SectionLabel>
              {step === 'preview' && (
                <button onClick={handleRegenerate} disabled={loading} style={{
                  padding: '6px 14px', borderRadius: 6,
                  background: 'transparent', border: '1px solid #1e1e3a',
                  color: '#666', fontSize: 12, cursor: 'pointer',
                }}>
                  🔄 Regenerate
                </button>
              )}
            </div>
            <PosterPreview
              imageUrl={result?.imageUrl}
              caption={result?.caption}
              loading={loading}
              templatePreview={step === 'input' ? selectedTemplate.preview : undefined}
              templateLabel={step === 'input' ? selectedTemplate.label : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, selected, onClick }: {
  template: typeof TEMPLATES[0]; selected: boolean; onClick: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
      border: `1px solid ${selected ? '#4f46e5' : '#1a1a2e'}`,
      background: selected ? '#0d0a2a' : '#0a0a14',
      transition: 'all 0.15s',
    }}>
      {/* Mini template swatch */}
      <div style={{
        width: 40, height: 40, borderRadius: 6, flexShrink: 0,
        background: template.preview.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `2px solid ${selected ? template.preview.accent : 'transparent'}`,
        fontSize: 16,
      }}>
        {template.emoji}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: selected ? '#a5b4fc' : '#ccc' }}>
          {template.label}
        </div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 1 }}>{template.desc}</div>
      </div>
      {selected && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#4f46e5', flexShrink: 0,
        }} />
      )}
    </div>
  );
}

function SuccessCard({ onReset }: { onReset: () => void }) {
  return (
    <div style={{
      maxWidth: 480, margin: '60px auto', textAlign: 'center',
      background: '#0a1a0f', border: '1px solid #1a4a2a',
      borderRadius: 16, padding: 48,
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 10px', color: '#fff' }}>
        Posted to LinkedIn!
      </h2>
      <p style={{ color: '#666', fontSize: 15, margin: '0 0 32px', lineHeight: 1.6 }}>
        Your post is live on your LinkedIn company page.
      </p>
      <button onClick={onReset} style={{
        padding: '12px 32px', borderRadius: 10,
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>
        Create Another Post
      </button>
    </div>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#555',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 10, ...style,
    }}>
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      background: '#1a0808', border: '1px solid #4a1515',
      borderRadius: 8, padding: '12px 16px',
      color: '#f87171', fontSize: 13, marginBottom: 16, lineHeight: 1.5,
    }}>
      ⚠️ {message}
    </div>
  );
}