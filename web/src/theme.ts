import React from 'react';

export const C = {
  bg: '#0A0C0F', surface: '#111419', surfaceEl: '#1A1E25', surfaceMid: '#222835',
  border: '#1E2530', borderLight: '#263040',
  accent: '#00E5A0', accentBg: '#002A1F',
  amber: '#F5A623', amberBg: '#2A1D00',
  text: '#E8E4DC', textSec: '#94A3B8', textMuted: '#6B7280', textInverse: '#0A0C0F',
  success: '#00E5A0', successBg: '#002A1F',
  danger: '#EF4444', dangerBg: '#1F0808',
  warning: '#F5A623', warningBg: '#2A1D00',
  info: '#4A9EFF', infoBg: '#0C1A35',
  chart: ['#00E5A0','#4A9EFF','#F5A623','#8B5CF6','#EC4899','#06B6D4','#F97316','#64748B'],
};

export const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

export const card: React.CSSProperties = {
  background: '#111419', border: '1px solid #1E2530',
  borderRadius: 12, padding: 16,
};

export const gradAccent = 'linear-gradient(135deg, #00E5A0, #00B87A)';
export const gradBlue   = 'linear-gradient(135deg, #1A1E25, #111419)';
export const gradHero   = 'linear-gradient(160deg, #0E1620, #0A0C0F)';

export const numHero: React.CSSProperties = { fontFamily: "'DM Mono', monospace", fontWeight: 300, letterSpacing: 1 };
export const numAmount: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontFeatureSettings: '"tnum"' };
export const numKpi: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: -0.3, fontFeatureSettings: '"tnum"' };
export const numPct: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontFeatureSettings: '"tnum"' };
