import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal } from '@nexo/shared';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatCurrency } from '../../utils/format';

export function GoalProgressCard({ goal, currency }: { goal: Goal; currency: string }) {
  const progress = goal.progress_percentage || 0;

  return (
    <View style={[styles.card, { borderLeftColor: goal.color || Colors.primary }]}>
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: (goal.color || Colors.primary) + '20' }]}>
          <Ionicons name={(goal.icon as 'target') || 'flag'} size={18} color={goal.color || Colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{goal.name}</Text>
          <Text style={styles.amounts}>
            {formatCurrency(goal.current_amount, currency, true)} / {formatCurrency(goal.target_amount, currency, true)}
          </Text>
        </View>
        <Text style={[styles.pct, { color: goal.color || Colors.primary }]}>{progress.toFixed(0)}%</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` as `${number}%`, backgroundColor: goal.color || Colors.primary }]} />
      </View>

      {goal.months_to_goal !== null && goal.months_to_goal !== undefined && (
        <Text style={styles.timeLeft}>
          {goal.months_to_goal === 0
            ? '¡Meta alcanzada!'
            : `${goal.months_to_goal} ${goal.months_to_goal === 1 ? 'mes' : 'meses'} para alcanzar la meta`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  iconBg: { width: 36, height: 36, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  name: { color: Colors.textPrimary, fontSize: Typography.sm, fontWeight: Typography.semibold },
  amounts: { color: Colors.textSecondary, fontSize: Typography.xs },
  pct: { fontSize: Typography.md, fontWeight: Typography.bold },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: BorderRadius.full, overflow: 'hidden', marginBottom: Spacing.xs },
  progressFill: { height: '100%', borderRadius: BorderRadius.full },
  timeLeft: { color: Colors.textMuted, fontSize: Typography.xs },
});
