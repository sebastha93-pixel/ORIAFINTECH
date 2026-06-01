export const C = {
  bg: '#070B14', surface: '#0F172A', surfaceEl: '#162033',
  border: '#1E2D45', borderLight: '#243553',
  primary: '#1E3A8A', primaryLight: '#2563EB', primaryGlow: '#3B82F6',
  accent: '#22C55E', accentDark: '#16A34A', accentLight: '#4ADE80',
  text: '#F8FAFC', textSec: '#94A3B8', textMuted: '#64748B',
  success: '#22C55E', successBg: '#052E16',
  danger: '#EF4444', dangerBg: '#1F0808',
  warning: '#F59E0B',
  chart: ['#22C55E','#3B82F6','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#F97316','#64748B'],
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
export const gradHero   = `linear-gradient(135deg, #0F2563, ${C.bg})`;
