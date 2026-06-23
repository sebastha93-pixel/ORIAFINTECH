import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { NetWorthSnapshot } from '../../types';
import { Colors, Spacing, Typography, BorderRadius, NumberTextStyles } from '../../theme';
import { formatCurrency } from '../../utils/format';

const { width } = Dimensions.get('window');

export function NetWorthCard({ history, currency }: { history: NetWorthSnapshot[]; currency: string }) {
  if (history.length < 2) return null;

  const values = history.map(h => Number(h.net_worth));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const chartWidth = width - Spacing.lg * 4;
  const chartHeight = 80;
  const pointsPerItem = chartWidth / (history.length - 1);

  const points = history.map((h, i) => ({
    x: i * pointsPerItem,
    y: chartHeight - ((Number(h.net_worth) - minVal) / range) * chartHeight,
  }));

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  const latestValue = values[values.length - 1];
  const firstValue = values[0];
  const change = latestValue - firstValue;
  const isPositive = change >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.currentValue}>{formatCurrency(latestValue, currency, true)}</Text>
        <Text style={[styles.change, { color: isPositive ? Colors.success : Colors.danger }]}>
          {isPositive ? '+' : ''}{formatCurrency(change, currency, true)} ({history.length} meses)
        </Text>
      </View>

      {/* Simple SVG line chart substitute using View */}
      <View style={[styles.chart, { height: chartHeight }]}>
        {points.map((point, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: prev.x,
                top: Math.min(prev.y, point.y),
                width: Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2)),
                height: 2,
                backgroundColor: isPositive ? Colors.success : Colors.danger,
                transform: [{ rotate: `${Math.atan2(point.y - prev.y, point.x - prev.x)}rad` }],
                transformOrigin: '0 50%',
              }}
            />
          );
        })}
        {/* Last point dot */}
        <View style={[styles.lastDot, {
          left: points[points.length - 1].x - 4,
          top: points[points.length - 1].y - 4,
          backgroundColor: isPositive ? Colors.success : Colors.danger,
        }]} />
      </View>

      <View style={styles.labels}>
        <Text style={styles.label}>{history[0]?.snapshot_date?.slice(0, 7)}</Text>
        <Text style={styles.label}>{history[history.length - 1]?.snapshot_date?.slice(0, 7)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: { marginBottom: Spacing.md },
  currentValue: { ...NumberTextStyles.kpi, color: Colors.textPrimary, fontSize: Typography.xl },
  change: { fontSize: Typography.xs, marginTop: 2 },
  chart: { position: 'relative', marginBottom: Spacing.xs },
  lastDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: Colors.textMuted, fontSize: Typography.xs },
});
