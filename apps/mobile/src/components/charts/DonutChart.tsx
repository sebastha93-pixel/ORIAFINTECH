import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CategorySpending } from '@nexo/shared';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatCurrency } from '../../utils/format';

// Donut puro en React Native (sin SVG externo)
// Usa capas de View con borderRadius y rotaciones
export function DonutChart({
  data,
  currency,
}: {
  data: CategorySpending[];
  currency: string;
}) {
  const top = data.slice(0, 6);
  const total = top.reduce((s, d) => s + d.amount, 0);

  return (
    <View style={styles.container}>
      {/* Left: donut visual */}
      <View style={styles.donutWrap}>
        <DonutRings slices={top} total={total} />
        <View style={styles.donutCenter}>
          <Text style={styles.centerLabel}>Total</Text>
          <Text style={styles.centerValue}>
            {formatCurrency(total, currency, true)}
          </Text>
        </View>
      </View>

      {/* Right: legend */}
      <View style={styles.legend}>
        {top.map((item, i) => (
          <View key={item.category_id} style={styles.legendRow}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: Colors.chart[i % Colors.chart.length] },
              ]}
            />
            <Text style={styles.legendName} numberOfLines={1}>
              {item.category_name}
            </Text>
            <View style={styles.legendRight}>
              <Text style={styles.legendPct}>
                {item.percentage.toFixed(0)}%
              </Text>
              <Text style={styles.legendAmt}>
                {formatCurrency(item.amount, currency, true)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Donut rings (arcos usando BorderRadius trick) ──────────────
function DonutRings({
  slices,
  total,
}: {
  slices: CategorySpending[];
  total: number;
}) {
  const SIZE = 120;
  const STROKE = 18;

  // Calcula posiciones en el círculo como mini-barras de arco
  // Approach: usamos una barra de progreso circular con segmentos
  let cumulativePct = 0;

  return (
    <View style={[styles.donutRingWrap, { width: SIZE, height: SIZE }]}>
      {/* Base ring */}
      <View
        style={[
          styles.donutRingBase,
          {
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: STROKE,
            borderColor: Colors.surfaceMid,
          },
        ]}
      />
      {/* Colored segments */}
      {slices.map((slice, i) => {
        const pct = slice.amount / total;
        const startDeg = cumulativePct * 360;
        cumulativePct += pct;
        const color = Colors.chart[i % Colors.chart.length];

        // Only render if segment is meaningful
        if (pct < 0.02) return null;

        return (
          <DonutSegment
            key={slice.category_id}
            size={SIZE}
            stroke={STROKE}
            startDeg={startDeg}
            sweepDeg={pct * 360}
            color={color}
          />
        );
      })}
    </View>
  );
}

function DonutSegment({
  size,
  stroke,
  startDeg,
  sweepDeg,
  color,
}: {
  size: number;
  stroke: number;
  startDeg: number;
  sweepDeg: number;
  color: string;
}) {
  // React Native native donut using overflow+rotate trick per segment
  const half = size / 2;

  if (sweepDeg <= 180) {
    return (
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ rotate: `${startDeg}deg` }] },
          { overflow: 'hidden', borderRadius: half },
        ]}
      >
        <View
          style={[
            { width: half, height: size, overflow: 'hidden' },
          ]}
        >
          <View
            style={{
              width: size,
              height: size,
              borderRadius: half,
              borderWidth: stroke,
              borderColor: color,
              transform: [{ rotate: `${sweepDeg - 180}deg` }],
              position: 'absolute',
              left: 0,
              top: 0,
            }}
          />
        </View>
      </View>
    );
  }

  // Segment > 180: render in two halves
  return (
    <>
      <DonutSegment size={size} stroke={stroke} startDeg={startDeg} sweepDeg={180} color={color} />
      <DonutSegment size={size} stroke={stroke} startDeg={startDeg + 180} sweepDeg={sweepDeg - 180} color={color} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },

  // Donut
  donutWrap: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  donutRingWrap: { position: 'relative' },
  donutRingBase: { position: 'absolute' },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: { color: Colors.textMuted, fontSize: Typography.xs },
  centerValue: {
    color: Colors.textPrimary,
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },

  // Legend
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendName: { flex: 1, color: Colors.textSecondary, fontSize: Typography.xs },
  legendRight: { alignItems: 'flex-end' },
  legendPct: { color: Colors.textPrimary, fontSize: Typography.xs, fontWeight: Typography.semibold },
  legendAmt: { color: Colors.textMuted, fontSize: 10 },
});
