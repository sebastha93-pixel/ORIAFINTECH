import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { NetWorthSnapshot } from '@nexo/shared';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatCurrency } from '../../utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  history: NetWorthSnapshot[];
  height?: number;
  color?: string;
  compact?: boolean;   // sin etiquetas — para el hero card
  currency?: string;
}

export function NetWorthLineChart({
  history,
  height = 120,
  color = Colors.accent,
  compact = false,
  currency = 'COP',
}: Props) {
  if (history.length < 2) return null;

  const values = history.map(h => Number(h.net_worth));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const chartW = SCREEN_WIDTH - Spacing.lg * 4 - (compact ? 0 : 0);
  const chartH = height;
  const stepX = chartW / (values.length - 1);

  const points = values.map((v, i) => ({
    x: i * stepX,
    y: chartH - 8 - ((v - minVal) / range) * (chartH - 16),
  }));

  const lastPt = points[points.length - 1];

  return (
    <View style={{ height: chartH }}>
      {/* Line segments rendered as thin Views */}
      {points.map((pt, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        const dx = pt.x - prev.x;
        const dy = pt.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: prev.x,
              top: prev.y,
              width: len,
              height: 2,
              backgroundColor: color,
              opacity: 0.9,
              borderRadius: 1,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: '0 50%',
            }}
          />
        );
      })}

      {/* Area fill (simplified with gradient-like opacity bars) */}
      {!compact && points.map((pt, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        const areaH = chartH - Math.min(pt.y, prev.y);
        return (
          <View
            key={`area-${i}`}
            style={{
              position: 'absolute',
              left: prev.x,
              top: Math.min(pt.y, prev.y),
              width: stepX,
              height: areaH,
              backgroundColor: color,
              opacity: 0.06,
            }}
          />
        );
      })}

      {/* Last point dot + glow */}
      <View
        style={{
          position: 'absolute',
          left: lastPt.x - 5,
          top: lastPt.y - 5,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 6,
          elevation: 4,
        }}
      />

      {/* Labels (full chart only) */}
      {!compact && (
        <>
          <Text style={[styles.label, { left: 0, top: chartH - 14 }]}>
            {history[0]?.snapshot_date?.slice(0, 7)}
          </Text>
          <Text style={[styles.label, { right: 0, top: chartH - 14 }]}>
            {history[history.length - 1]?.snapshot_date?.slice(0, 7)}
          </Text>
          <Text style={[styles.valueLabel, { right: 0, top: lastPt.y - 18, color }]}>
            {formatCurrency(values[values.length - 1], currency, true)}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    color: Colors.textMuted,
    fontSize: Typography.xs,
  },
  valueLabel: {
    position: 'absolute',
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
});
