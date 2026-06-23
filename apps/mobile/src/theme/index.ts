// ============================================================
// ORIA — Design System (v3 — ORIA Brand)
// Paleta: #0A0C0F · #00E5A0 · #F5A623 · #EF4444 · #E8E4DC
// Tipografía: DM Mono (hero) / DM Sans (body)
// ============================================================

export const Colors = {
  // ── Backgrounds ────────────────────────────────────────
  background: '#0A0C0F',      // main background
  surface: '#111419',          // cards, sheets
  surfaceElevated: '#1A1E25',  // elevated surfaces
  surfaceMid: '#222835',       // inputs, chips

  // ── Borders ────────────────────────────────────────────
  border: '#1E2530',
  borderLight: '#263040',

  // ── Text ───────────────────────────────────────────────
  textPrimary: '#E8E4DC',
  textSecondary: '#94A3B8',
  textMuted: '#6B7280',
  textInverse: '#0A0C0F',

  // ── Accent (green — primary action, income) ────────────
  accent: '#00E5A0',
  accentBg: '#002A1F',

  // ── Amber (goals, savings, warnings) ───────────────────
  amber: '#F5A623',
  amberBg: '#2A1D00',

  // ── Danger (expenses, errors) ──────────────────────────
  danger: '#EF4444',
  dangerBg: '#1F0808',

  // ── Semantic aliases (mapped to ORIA palette) ──────────
  success: '#00E5A0',          // = accent
  successBg: '#002A1F',        // = accentBg
  warning: '#F5A623',          // = amber
  warningBg: '#2A1D00',        // = amberBg
  info: '#4A9EFF',
  infoBg: '#0C1A35',

  // ── Gradient aliases (kept for migration compat) ───────
  gradientAccent: ['#00E5A0', '#00B87A'] as [string, string],
  gradientCard: ['#1A1E25', '#111419'] as [string, string],
  gradientHero: ['#0E1620', '#0A0C0F'] as [string, string],

  // ── Charts ─────────────────────────────────────────────
  chart: [
    '#00E5A0', // accent green
    '#4A9EFF', // blue
    '#F5A623', // amber
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
    '#6B7280', // muted gray
  ],

  // ── Account type colors ────────────────────────────────
  accounts: {
    checking: '#4A9EFF',
    savings: '#00E5A0',
    credit_card: '#EF4444',
    investment: '#8B5CF6',
    crypto: '#F5A623',
    cash: '#6B7280',
    loan: '#DC2626',
    other: '#00E5A0',
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
    shadowColor: '#00E5A0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  glowBlue: {
    shadowColor: '#4A9EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
