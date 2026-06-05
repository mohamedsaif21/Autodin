'use client';
import { useState, useEffect } from 'react';
import PosterPreview from './PosterPreview';

const THEME_COLORS: Record<string, string> = {
  dark_purple:   '#a855f7',
  warm_orange:   '#f97316',
  deep_red:      '#ef4444',
  midnight_blue: '#38bdf8',
  forest_green:  '#22c55e',
};

interface DayInfo {
  found: boolean;
  name?: string;
  theme?: string;
  source?: 'custom' | 'nager';
  date?: string;
}

interface GeneratedData {
  caption: string;
  posterTitle: string;
  posterSubtitle: string;
  accentWord: string;
  imagePrompt: string;
  colorTheme: string;
  imageUrl?: string;
}

type Step = 'idle' | 'checking' | 'found' | 'not_found' | 'generating' | 'preview' | 'posting' | 'posted';

export default function CalendarMode() {
  const [step, setStep] = useState<Step>('idle');
  const [dayInfo, setDayInfo] = useState<DayInfo | null>(null);
  const [data, setData] = useState<GeneratedData | null>(null);
  const [brandName, setBrandName] = useState('ATTEST');
  const [error, setError] = useState('');
  const [genPhase, setGenPhase] = useState('');
  const [testDate, setTestDate] = useState('');

  // Format today nicely
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  async function checkDay(dateOverride?: string) {
    setStep('checking'); setError(''); setData(null);

    try {
      let info: DayInfo;
      if (dateOverride) {
        // Test a specific date via POST
        const res = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateOverride }),
        });
        info = await res.json();
      } else {
        const res = await fetch('/api/calendar');
        info = await res.json();
      }

      setDayInfo(info);
      setStep(info.found ? 'found' : 'not_found');
    } catch (e: any) {
      setError('Calendar check failed: ' + e.message);
      setStep('idle');
    }
  }

  async function handleGenerate() {
    if (!dayInfo?.name) return;
    setStep('generating'); setError('');

    try {
      // Phase 1: Gemini
      setGenPhase('🧠  Gemini writing caption for ' + dayInfo.name + '...');
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialDay: dayInfo.name, type: 'calendar' }),
      });
      const genData = await genRes.json();
      if (genData.error) throw new Error('Gemini: ' + genData.error);

      // Use the theme from the calendar day if Gemini didn't set one
      const finalTheme = genData.colorTheme || dayInfo.theme || 'dark_purple';

      // Phase 2: Pollinations + Canvas overlay
      setGenPhase('🎨  Generating poster via Pollinations...');
      const imgRes = await fetch('/api/poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePrompt: genData.imagePrompt,
        }),
      });
      const imgData = await imgRes.json().catch(() => ({}));
      if (!imgRes.ok) throw new Error(imgData?.error || `Poster API error: ${imgRes.status}`);
      if (imgData.error) throw new Error(imgData.error);

      setData({ ...genData, colorTheme: finalTheme, imageUrl: imgData.imageUrl });
      setStep('preview');
    } catch (e: any) {
      setError(e.message);
      setStep('found');
    }
    setGenPhase('');
  }

  async function handlePost() {
    if (!data?.imageUrl) return;
    setStep('posting'); setError('');
    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: data.imageUrl, caption: data.caption }),
      });
      const result = await res.json();
      if (result.success) setStep('posted');
      else throw new Error(result.error || JSON.stringify(result.details));
    } catch (e: any) {
      setError('Post failed: ' + e.message);
      setStep('preview');
    }
  }

  function reset() {
    setStep('idle'); setDayInfo(null); setData(null); setError(''); setTestDate('');
  }

  const accentColor = THEME_COLORS[dayInfo?.theme || 'dark_purple'];

  return (
    <div style={{ maxWidth: 1040 }}>
      {step === 'posted' ? (
        <SuccessCard dayName={dayInfo?.name || ''} onReset={reset} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 40, alignItems: 'start' }}>

          {/* ── LEFT PANEL ── */}
          <div>
            {/* Today's date card */}
            <div style={{
              background: '#0c0c18', border: '1px solid #1a1a30',
              borderRadius: 12, padding: '18px 20px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Today
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#e8e8f0' }}>{todayFormatted}</div>
            </div>

            {/* Brand name input */}
            <Label>Brand / Company name</Label>
            <input
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="ATTEST"
              style={{
                width: '100%', background: '#0c0c18', border: '1px solid #1e1e35',
                borderRadius: 10, padding: '11px 15px', color: '#e8e8f0',
                fontSize: 14, boxSizing: 'border-box', outline: 'none', marginBottom: 20,
              }}
            />

            {/* Day detection result */}
            {step === 'found' && dayInfo?.name && (
              <div style={{
                background: '#080f08', border: `1px solid ${accentColor}33`,
                borderRadius: 12, padding: '16px 18px', marginBottom: 18,
              }}>
                <div style={{ fontSize: 11, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  {dayInfo.source === 'custom' ? '📅 Custom calendar' : '🌐 Public holiday'} — Special day found!
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{dayInfo.name}</div>
                <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>
                  Auto-theme: <span style={{ color: accentColor }}>●</span> {dayInfo.theme?.replace('_', ' ')}
                </div>
              </div>
            )}

            {step === 'not_found' && (
              <div style={{
                background: '#0f0f0f', border: '1px solid #1a1a1a',
                borderRadius: 12, padding: '16px 18px', marginBottom: 18, textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                <div style={{ color: '#555', fontSize: 14 }}>No special day today.</div>
                <div style={{ color: '#333', fontSize: 12, marginTop: 4 }}>
                  Try testing a specific date below, or use Manual mode.
                </div>
              </div>
            )}

            {/* Generating status */}
            {step === 'generating' && (
              <div style={{
                background: '#0c0c20', border: '1px solid #1e1e40',
                borderRadius: 12, padding: '18px', marginBottom: 18, textAlign: 'center',
              }}>
                <LoadingDots />
                <div style={{ color: '#555', fontSize: 13, marginTop: 10 }}>{genPhase}</div>
              </div>
            )}

            {error && (
              <div style={{
                background: '#1a0808', border: '1px solid #3a1010',
                borderRadius: 8, padding: '11px 14px', color: '#f87171',
                fontSize: 13, marginBottom: 16, lineHeight: 1.5,
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* ── Action buttons ── */}
            {step === 'idle' && (
              <button onClick={() => checkDay()} style={primaryBtn('#4f46e5', '#7c3aed')}>
                🗓️  Check Today for Special Day
              </button>
            )}

            {step === 'checking' && (
              <div style={{
                ...primaryBtn('#111', '#111'),
                textAlign: 'center', color: '#444', cursor: 'default',
              }}>
                <LoadingDots /> <span style={{ marginLeft: 8 }}>Checking calendar...</span>
              </div>
            )}

            {step === 'found' && (
              <button onClick={handleGenerate} style={primaryBtn('#4f46e5', '#7c3aed')}>
                ✨  Generate Post for {dayInfo?.name}
              </button>
            )}

            {step === 'not_found' && (
              <button onClick={() => checkDay()} style={{
                ...primaryBtn('#1a1a2a', '#1a1a2a'),
                border: '1px solid #2a2a3a', color: '#555',
              }}>
                🔄  Check Again
              </button>
            )}

            {step === 'preview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={handlePost} style={primaryBtn('#0077b5', '#005885')}>
                  🔗  Post to LinkedIn
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleGenerate} style={outlineBtn}>🔄 Regenerate</button>
                  <button onClick={reset} style={outlineBtn}>✕ Start over</button>
                </div>
              </div>
            )}

            {step === 'posting' && (
              <div style={{
                padding: '14px', borderRadius: 10, background: '#001525',
                border: '1px solid #003050', textAlign: 'center',
                color: '#38bdf8', fontSize: 14,
              }}>
                <LoadingDots color="#38bdf8" />
                <div style={{ marginTop: 8 }}>Uploading to LinkedIn...</div>
              </div>
            )}

            {/* ── Test date picker ── */}
            <div style={{
              marginTop: 28, paddingTop: 20,
              borderTop: '1px solid #111120',
            }}>
              <Label>🧪 Test a specific date</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="date"
                  value={testDate}
                  onChange={e => setTestDate(e.target.value)}
                  style={{
                    flex: 1, background: '#0c0c18', border: '1px solid #1e1e35',
                    borderRadius: 8, padding: '9px 12px', color: '#e8e8f0',
                    fontSize: 13, outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
                <button
                  onClick={() => testDate && checkDay(testDate)}
                  disabled={!testDate}
                  style={{
                    padding: '9px 16px', borderRadius: 8, border: 'none',
                    background: testDate ? '#1a1a35' : '#0c0c18',
                    color: testDate ? '#a5b4fc' : '#333',
                    fontSize: 13, cursor: testDate ? 'pointer' : 'not-allowed',
                  }}>
                  Test
                </button>
              </div>
              <p style={{ color: '#2a2a3a', fontSize: 11, margin: '6px 0 0', lineHeight: 1.5 }}>
                Try Aug 15, Jan 26, Oct 2 to see special days.
              </p>
            </div>

            {/* ── Upcoming special days ── */}
            <UpcomingDays />
          </div>

          {/* ── RIGHT: Preview ── */}
          <PosterPreview
            imageUrl={data?.imageUrl}
            caption={data?.caption}
            loading={step === 'generating'}
          />
        </div>
      )}
    </div>
  );
}

function UpcomingDays() {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayMmdd = `${mm}-${dd}`;

  const upcoming = (require('@/data/special-days.json') as any[])
    .filter(d => d.date > todayMmdd)
    .slice(0, 4);

  if (!upcoming.length) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <Label>Upcoming special days</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {upcoming.map(d => {
          const color = ({
            dark_purple: '#a855f7', warm_orange: '#f97316',
            deep_red: '#ef4444', midnight_blue: '#38bdf8', forest_green: '#22c55e',
          } as any)[d.theme] || '#666';
          return (
            <div key={d.date} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: '#0a0a14', border: '1px solid #111120',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12, color: '#666' }}>{d.date}</div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>{d.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────

function primaryBtn(from: string, to: string): React.CSSProperties {
  return {
    width: '100%', padding: '14px', borderRadius: 10, border: 'none',
    background: `linear-gradient(135deg, ${from}, ${to})`,
    color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    letterSpacing: '0.02em',
  };
}

const outlineBtn: React.CSSProperties = {
  flex: 1, padding: '10px', borderRadius: 8,
  background: 'transparent', border: '1px solid #1e1e35',
  color: '#555', fontSize: 13, cursor: 'pointer',
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#444',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 9,
    }}>
      {children}
    </div>
  );
}

function LoadingDots({ color = '#4f46e5' }: { color?: string }) {
  return (
    <div style={{ display: 'inline-flex', gap: 5, alignItems: 'center', height: 20 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: color,
          animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
      <style>{`@keyframes bounce{0%,100%{transform:scale(0.6);opacity:0.4}50%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

function SuccessCard({ dayName, onReset }: { dayName: string; onReset: () => void }) {
  return (
    <div style={{
      maxWidth: 460, margin: '80px auto', textAlign: 'center',
      background: '#071510', border: '1px solid #0d3020',
      borderRadius: 16, padding: 56,
    }}>
      <div style={{ fontSize: 60, marginBottom: 18 }}>🎉</div>
      <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 10px', color: '#fff' }}>
        Posted for {dayName}!
      </h2>
      <p style={{ color: '#555', fontSize: 15, margin: '0 0 36px', lineHeight: 1.6 }}>
        Your {dayName} post is now live on LinkedIn.
      </p>
      <button onClick={onReset} style={{
        padding: '12px 36px', borderRadius: 10,
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
      }}>
        Back to Calendar
      </button>
    </div>
  );
}