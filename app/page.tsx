'use client';

import { useState } from 'react';
import ManualMode from '@/components/ManualMode';
import CalendarMode from '@/components/CalendarMode';
import ScheduledMode from '@/components/Scheduledmode';

export default function Home() {
  const [tab, setTab] = useState<'manual' | 'calendar' | 'scheduled'>('manual');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        color: '#fff',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      }}
    >
      <header
        style={{
          borderBottom: '1px solid #1a1a26',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>📸</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Autodin</h1>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>prototype</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1150, margin: '0 auto', padding: '24px 18px 32px' }}>
        <div
          style={{
            display: 'inline-flex',
            background: '#12121b',
            border: '1px solid #202030',
            borderRadius: 10,
            padding: 5,
            marginBottom: 22,
          }}
        >
          {(['manual', 'calendar', 'scheduled'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 20px',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? '#0a0a0f' : '#666',
                transition: 'all 0.15s',
              }}
            >
              {t === 'manual' ? '✏️  Manual Post' : t === 'calendar' ? '📅  Calendar Auto' : '🗓️  Scheduled'}
            </button>
          ))}
        </div>

        {tab === 'manual' ? <ManualMode /> : tab === 'calendar' ? <CalendarMode /> : <ScheduledMode />}
      </main>
    </div>
  );
}
