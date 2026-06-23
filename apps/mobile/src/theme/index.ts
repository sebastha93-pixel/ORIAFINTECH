// ============================================================
// NEXO FINANZAS — Design System (v2 — Brand Oficial)
// Paleta: #0F172A · #1E3A8A · #22C55E · #F8FAFC · #64748B
// Tipografía: Poppins (headers) / Inter (body)
// ============================================================

export const Colors = {
  // ── Brand ──────────────────────────────────────────────
  primary: '#1E3A8A',       // Azul profundo — confianza
  primaryLight: '#2563EB',  // Azul medio
  primaryGlow: '#3B82F6',   // Azul brillante (botones)
  accent: '#22C55E',        // Verde — crecimiento / positivo
  accentLight: '#4ADE80',
  accentDark: '#16A34A',

  // ── Fondos ─────────────────────────────────────────────
  background: '#070B14',    // Negro azulado profundo
  surface: '#0F172A',       // Superficie de cards
  surfaceElevated: '#162033',
  surfaceMid: '#1E2A3E',
  border: '#1E2D45',
  borderLight: '#243553',

  // ── Texto ──────────────────────────────────────────────
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  // ── Semánticos ─────────────────────────────────────────
  success: '#22C55E',
  successBg: '#052E16',
  warning: '#F59E0B',
  warningBg: '#1C1003',
  danger: '#EF4444',
  dangerBg: '#1F0808',
  info: '#3B82F6',
  infoBg: '#0C1A35',

  // ── Gradientes (arrays para LinearGradient) ────────────
  gradientBrand: ['#1E3A8A', '#0F2563'] as [string, string],
  gradientAccent: ['#22C55E', '#16A34A'] as [string, string],
  gradientCard: ['#162033', '#0F172A'] as [string, string],
  gradientHero: ['#0F2563', '#070B14'] as [string, string],

  // ── Gráficas ───────────────────────────────────────────
  chart: [
    '#22C55E', // Vivienda — verde
    '#3B82F6', // Alimentación — azul
    '#F59E0B', // Transporte — amarillo
    '#8B5CF6', // Entretenimiento — violeta
    '#EC4899', // Salud — rosa
    '#06B6D4', // Educación — cyan
    '#F97316', // Ropa — naranja
    '#64748B', // Otros — gris
  ],

  // ── Tipos de cuenta ────────────────────────────────────
  accounts: {
    checking: '#3B82F6',
    savings: '#22C55E',
    credit_card: '#EF4444',
    investment: '#8B5CF6',
    crypto: '#F59E0B',
    cash: '#64748B',
    loan: '#DC2626',
    other: '#1E3A8A',
  },
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

export const Typography = {
  // Tamaños
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  display: 38,
  hero: 46,

  // Pesos
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,

  // ── DM Fonts (cargadas via @expo-google-fonts) ──
  fontMono: 'DMMono_300Light' as string,           // números hero/focales
  fontMonoRegular: 'DMMono_400Regular' as string,  // mono secundario
  fontSans: 'DMSans_400Regular' as string,         // cuerpo
  fontSansMedium: 'DMSans_500Medium' as string,    // montos secundarios
  fontSansSemibold: 'DMSans_600SemiBold' as string,// KPIs y porcentajes
  fontSansBold: 'DMSans_700Bold' as string,        // énfasis

  // Legacy — para componentes aún no migrados
  fontHeader: 'DMSans_700Bold',
  fontHeaderSemi: 'DMSans_600SemiBold',
  fontBody: 'DMSans_400Regular',
  fontBodyMedium: 'DMSans_500Medium',
  fontBodyBold: 'DMSans_700Bold',
} as const;

// ─── Estilos reutilizables para números ────────────────
// Usar como: StyleSheet.create({ myNum: { ...NumberTextStyles.amount, color: ... } })
export const NumberTextStyles = {
  // Monto hero (patrimonio neto, score grande)
  hero: {
    fontFamily: 'DMMono_300Light',
    fontWeight: '300' as const,
    letterSpacing: 1,
  },
  // KPI grande (análisis, stat cards)
  kpi: {
    fontFamily: 'DMSans_600SemiBold',
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'] as const,
  },
  // Monto estándar (fila transacción, saldo cuenta)
  amount: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500' as const,
    fontVariant: ['tabular-nums'] as const,
  },
  // Monto pequeño (metas: actual / objetivo)
  amountSm: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500' as const,
    fontSize: 11,
    fontVariant: ['tabular-nums'] as const,
  },
  // Porcentaje grande (progreso de meta)
  percentageLg: {
    fontFamily: 'DMSans_600SemiBold',
    fontWeight: '600' as const,
    fontVariant: ['tabular-nums'] as const,
  },
  // Porcentaje inline (cambio vs mes anterior)
  percentageSm: {
    fontFamily: 'DMSans_600SemiBold',
    fontWeight: '600' as const,
    fontSize: 11,
    fontVariant: ['tabular-nums'] as const,
  },
} as const;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  glowBlue: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
