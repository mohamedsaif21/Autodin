import { NextResponse } from 'next/server';
import customDays from '@/data/special-days.json';

interface SpecialDay {
  name: string;
  theme: string;
  source: 'custom' | 'nager';
}

async function checkNagerDate(dateStr: string): Promise<SpecialDay | null> {
  try {
    const year = dateStr.split('-')[0];
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/IN`,
      { next: { revalidate: 86400 } } // cache 24h
    );
    if (!res.ok) return null;
    const holidays = await res.json();
    const match = holidays.find((h: any) => h.date === dateStr);
    if (match) {
      return { name: match.name, theme: 'deep_red', source: 'nager' };
    }
  } catch (e) {
    console.warn('Nager.Date API failed:', e);
  }
  return null;
}

export async function GET() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const fullDate = `${yyyy}-${mm}-${dd}`; // e.g. 2025-08-15
  const mmdd = `${mm}-${dd}`;             // e.g. 08-15

  // 1. Check custom list first (fastest, no network)
  const custom = (customDays as any[]).find(
    d => d.date === mmdd || d.date === fullDate
  );
  if (custom) {
    return NextResponse.json({
      found: true,
      name: custom.name,
      theme: custom.theme || 'dark_purple',
      source: 'custom',
      date: fullDate,
    });
  }

  // 2. Check Nager.Date for Indian public holidays
  const nager = await checkNagerDate(fullDate);
  if (nager) {
    return NextResponse.json({
      found: true,
      name: nager.name,
      theme: nager.theme,
      source: 'nager',
      date: fullDate,
    });
  }

  return NextResponse.json({ found: false, date: fullDate });
}

// Also expose a POST for testing specific dates
export async function POST(req: Request) {
  const { date } = await req.json(); // expects "YYYY-MM-DD"
  const mmdd = date.slice(5); // "MM-DD"

  const custom = (customDays as any[]).find(
    d => d.date === mmdd || d.date === date
  );
  if (custom) {
    return NextResponse.json({
      found: true, name: custom.name,
      theme: custom.theme || 'dark_purple',
      source: 'custom', date,
    });
  }

  const nager = await checkNagerDate(date);
  if (nager) {
    return NextResponse.json({
      found: true, name: nager.name,
      theme: nager.theme, source: 'nager', date,
    });
  }

  return NextResponse.json({ found: false, date });
}