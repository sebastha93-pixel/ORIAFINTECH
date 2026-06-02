export const C = {
  bg: '#081426', surface: '#0C1929', surfaceEl: '#112035',
  border: '#1A2D44', borderLight: '#243650',
  primary: '#1E3A8A', primaryLight: '#2563EB', primaryGlow: '#3B82F6',
  accent: '#31D67B', accentDark: '#22A85A', accentLight: '#5DE89A',
  text: '#F7F9FC', textSec: '#94A3B8', textMuted: '#5B7285',
  success: '#31D67B', successBg: '#042914',
  danger: '#EF4444', dangerBg: '#1F0808',
  warning: '#F59E0B',
  chart: ['#31D67B','#3B82F6','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#F97316','#64748B'],
};

export const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

export const card: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`,
  borderRadius: 18, padding: 16,
};

export const gradAccent = `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`;
export const gradBlue   = `linear-gradient(135deg, ${C.primaryGlow}, ${C.primary})`;
export const gradHero   = `linear-gradient(160deg, #102040, ${C.bg})`;
