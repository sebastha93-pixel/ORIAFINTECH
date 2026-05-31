import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CategorySpending } from '@nexo/shared';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatCurrency } from '../../utils/format';

export function SpendingChart({ data, currency }: { data: CategorySpending[]; currency: string }) {
  const top = data.slice(0, 6);
  const maxAmount = Math.max(...top.map(d => d.amount));

  return (
    <View style={styles.container}>
      {top.map((item, index) => (
        <View key={item.category_id} style={styles.row}>
          <View style={[styles.colorDot, { backgroundColor: Colors.chart[index % Colors.chart.length] }]} />
          <Text style={styles.name} numberOfLines={1}>{item.category_name}</Text>
          <View style={styles.barContainer}>
            <View
              style={[styles.bar, {
                width: `${(item.amount / maxAmount) * 100}%`,
                backgroundColor: Colors.chart[index % Colors.chart.length] + '80',
              }]}
            />
          </View>
          <Text style={styles.amount}>{formatCurrency(item.amount, currency, true)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  colorDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  name: { color: Colors.textSecondary, fontSize: Typography.xs, width: 80, flexShrink: 0 },
  barContainer: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: BorderRadius.full, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: BorderRadius.full },
  amount: { color: Colors.textPrimary, fontSize: Typography.xs, fontWeight: Typography.medium, width: 60, textAlign: 'right' },
});
