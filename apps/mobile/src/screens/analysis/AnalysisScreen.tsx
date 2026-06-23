import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Text as SvgText,
  Circle,
} from 'react-native-svg';

const W = Dimensions.get('window').width;
const CHART_W = W - 32;
const CHART_H = 200;
const PAD_LEFT = 40;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 30;

// ─── Mock data ────────────────────────────────────
type Period = 'Semana' | 'Mes' | 'Año';

const DATA: Record<Period, { label: string; income: number; expense: number }[]> = {
  Semana: [
    { label: 'Lun', income: 0, expense: 85000 },
    { label: 'Mar', income: 1200000, expense: 150000 },
    { label: 'Mié', income: 0, expense: 45000 },
    { label: 'Jue', income: 0, expense: 200000 },
    { label: 'Vie', income: 500000, expense: 320000 },
    { label: 'Sáb', income: 0, expense: 180000 },
    { label: 'Dom', income: 0, expense: 60000 },
  ],
  Mes: [
    { label: 'Sem 1', income: 3200000, expense: 850000 },
    { label: 'Sem 2', income: 800000, expense: 1200000 },
    { label: 'Sem 3', income: 1500000, expense: 700000 },
    { label: 'Sem 4', income: 3200000, expense: 950000 },
  ],
  Año: [
    { label: 'Ene', income: 4200000, expense: 2800000 },
    { label: 'Feb', income: 3800000, expense: 2400000 },
    { label: 'Mar', income: 5100000, expense: 3200000 },
    { label: 'Abr', income: 4600000, expense: 2900000 },
    { label: 'May', income: 6200000, expense: 3100000 },
    { label: 'Jun', income: 5800000, expense: 2700000 },
  ],
};

const TOP_CATEGORIES = [
  { name: 'Comida', emoji: '🍽️', amount: 1250000, color: '#00E5A0', pct: 0.78 },
  { name: 'Transporte', emoji: '🚗', amount: 480000, color: '#F5A623', pct: 0.30 },
  { name: 'Entretenimiento', emoji: '🎮', amount: 380000, color: '#8B5CF6', pct: 0.24 },
  { name: 'Salud', emoji: '🏥', amount: 210000, color: '#4A9EFF', pct: 0.13 },
];

// ─── Helpers ──────────────────────────────────────
const fmtK = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);

function buildPath(
  points: { x: number; y: number }[],
  close?: { bottom: number; left: number; right: number }
) {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  if (close) {
    d += ` L ${close.right} ${close.bottom} L ${close.left} ${close.bottom} Z`;
  }
  return d;
}

// ─── Area Chart ───────────────────────────────────
function AreaChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const cW = CHART_W - PAD_LEFT - PAD_RIGHT;
  const cH = CHART_H - PAD_TOP - PAD_BOTTOM;

  const allVals = data.flatMap((d) => [d.income, d.expense]);
  const maxVal = Math.max(...allVals, 1);

  const toX = (i: number) => PAD_LEFT + (i / (data.length - 1)) * cW;
  const toY = (v: number) => PAD_TOP + (1 - v / maxVal) * cH;

  const incomePoints = data.map((d, i) => ({ x: toX(i), y: toY(d.income) }));
  const expensePoints = data.map((d, i) => ({ x: toX(i), y: toY(d.expense) }));

  const bottomY = PAD_TOP + cH;
  const leftX = PAD_LEFT;
  const rightX = PAD_LEFT + cW;

  // Find peak income index
  let peakIdx = 0;
  let peakVal = 0;
  data.forEach((d, i) => {
    if (d.income > peakVal) { peakVal = d.income; peakIdx = i; }
  });
  const peakPt = incomePoints[peakIdx];

  // Grid lines (4 horizontal)
  const gridLines = [0.25, 0.5, 0.75, 1].map((frac) => ({
    y: PAD_TOP + (1 - frac) * cH,
    label: fmtK(maxVal * frac),
  }));

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <LinearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#00E5A0" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#00E5A0" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#EF4444" stopOpacity="0.25" />
          <Stop offset="1" stopColor="#EF4444" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Horizontal grid lines */}
      {gridLines.map((gl, i) => (
        <React.Fragment key={i}>
          <Line
            x1={PAD_LEFT}
            y1={gl.y}
            x2={PAD_LEFT + cW}
            y2={gl.y}
            stroke="#1E2530"
            strokeWidth={1}
          />
          <SvgText
            x={PAD_LEFT - 6}
            y={gl.y + 4}
            textAnchor="end"
            fill="#6B7280"
            fontSize={9}
          >
            {gl.label}
          </SvgText>
        </React.Fragment>
      ))}

      {/* Income gradient fill */}
      <Path
        d={buildPath(incomePoints, { bottom: bottomY, left: leftX, right: rightX })}
        fill="url(#incomeGrad)"
      />
      {/* Expense gradient fill */}
      <Path
        d={buildPath(expensePoints, { bottom: bottomY, left: leftX, right: rightX })}
        fill="url(#expenseGrad)"
      />

      {/* Income line (solid) */}
      <Path
        d={buildPath(incomePoints)}
        fill="none"
        stroke="#00E5A0"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Expense line (dashed simulation — using strokeDasharray) */}
      <Path
        d={buildPath(expensePoints)}
        fill="none"
        stroke="#EF4444"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6,4"
      />

      {/* X-axis labels */}
      {data.map((d, i) => (
        <SvgText
          key={i}
          x={toX(i)}
          y={bottomY + 18}
          textAnchor="middle"
          fill="#6B7280"
          fontSize={9}
        >
          {d.label}
        </SvgText>
      ))}

      {/* Glowing dot on peak income */}
      {peakPt && peakVal > 0 && (
        <>
          {/* Outer glow ring */}
          <Circle
            cx={peakPt.x}
            cy={peakPt.y}
            r={8}
            fill="#00E5A0"
            opacity={0.25}
          />
          <Circle
            cx={peakPt.x}
            cy={peakPt.y}
            r={4}
            fill="#00E5A0"
          />
          <Circle
            cx={peakPt.x}
            cy={peakPt.y}
            r={2}
            fill="#fff"
          />
        </>
      )}
    </Svg>
  );
}

// ─── Main Screen ──────────────────────────────────
export function AnalysisScreen() {
  const [period, setPeriod] = useState<Period>('Año');
  const data = DATA[period];

  const totalIncome = data.reduce((s, d) => s + d.income, 0);
  const totalExpense = data.reduce((s, d) => s + d.expense, 0);
  const totalNet = totalIncome - totalExpense;

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Análisis</Text>

          {/* Period toggle */}
          <View style={s.toggleRow}>
            {(['Semana', 'Mes', 'Año'] as Period[]).map((p) => (
              <Pressable
                key={p}
                style={({ pressed }) => [
                  s.toggleBtn,
                  period === p && s.toggleBtnActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[s.toggleText, period === p && s.toggleTextActive]}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* KPI row */}
        <View style={s.kpiRow}>
          <KpiCell label="Ingresos" value={totalIncome} color="#00E5A0" />
          <View style={s.kpiDivider} />
          <KpiCell label="Gastos" value={totalExpense} color="#EF4444" />
          <View style={s.kpiDivider} />
          <KpiCell label="Neto" value={totalNet} color={totalNet >= 0 ? '#00E5A0' : '#EF4444'} />
        </View>

        {/* Chart */}
        <View style={s.chartCard}>
          {/* Legend */}
          <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#00E5A0' }]} />
              <Text style={s.legendLabel}>Ingresos</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDash, { borderColor: '#EF4444' }]} />
              <Text style={s.legendLabel}>Gastos</Text>
            </View>
          </View>

          <AreaChart data={data} />
        </View>

        {/* Top categories */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Top categorías de gasto</Text>
          {TOP_CATEGORIES.map((cat) => (
            <View key={cat.name} style={s.catRow}>
              <Text style={s.catEmoji}>{cat.emoji}</Text>
              <View style={s.catInfo}>
                <View style={s.catTop}>
                  <Text style={s.catName}>{cat.name}</Text>
                  <Text style={[s.catAmt, { color: cat.color }]}>{fmt(cat.amount)}</Text>
                </View>
                <View style={s.barTrack}>
                  <View
                    style={[
                      s.barFill,
                      { width: `${cat.pct * 100}%` as any, backgroundColor: cat.color },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

function KpiCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.kpiCell}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiValue, { color }]}>{fmtK(value)}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0C0F' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E8E4DC',
  },

  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#111419',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2530',
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#00E5A0',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#0A0C0F',
    fontWeight: '600',
  },

  // KPI row
  kpiRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#111419',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2530',
    marginBottom: 12,
  },
  kpiCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  kpiDivider: {
    width: 1,
    backgroundColor: '#1E2530',
    marginVertical: 10,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  kpiValue: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },

  // Chart
  chartCard: {
    marginHorizontal: 16,
    backgroundColor: '#111419',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2530',
    paddingTop: 16,
    paddingBottom: 8,
    marginBottom: 20,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendDash: {
    width: 16,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  legendLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },

  // Top categories
  section: { paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E8E4DC',
    marginBottom: 14,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  catEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  catInfo: { flex: 1 },
  catTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  catName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E8E4DC',
  },
  catAmt: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 4,
    backgroundColor: '#1A1E25',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
});
