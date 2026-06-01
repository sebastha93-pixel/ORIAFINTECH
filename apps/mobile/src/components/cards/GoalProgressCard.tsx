import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Goal } from '../../types';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatCurrency } from '../../utils/format';

export function GoalProgressCard({
  goal,
  currency,
  onPress,
}: {
  goal: Goal;
  currency: string;
  onPress?: () => void;
}) {
  const progress = Math.min(goal.progress_percentage || 0, 100);
  const color    = goal.color || Colors.accent;
  const icon     = goal.icon  || 'flag';
  const remaining = Number(goal.target_amount) - Number(goal.current_amount);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <LinearGradient colors={Colors.gradientCard} style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconBg, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon as 'flag'} size={18} color={color} />
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.name}>{goal.name}</Text>
            <Text style={styles.type}>{typeLabel(goal.goal_type)}</Text>
          </View>

          <View style={styles.pctBlock}>
            <Text style={[styles.pct, { color }]}>{progress.toFixed(0)}%</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.barBg}>
          <View
            style={[
              styles.barFill,
              { width: `${progress}%` as `${number}%`, backgroundColor: color },
            ]}
          />
        </View>

        {/* Footer amounts */}
        <View style={styles.footer}>
          <Text style={styles.current}>
            {formatCurrency(goal.current_amount, currency, true)}
          </Text>
          <Text style={styles.separator}>/</Text>
          <Text style={styles.target}>
            {formatCurrency(goal.target_amount, currency, true)}
          </Text>

          {goal.months_to_goal != null && goal.months_to_goal > 0 && (
            <View style={styles.timeChip}>
              <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.timeText}>
                {goal.months_to_goal} {goal.months_to_goal === 1 ? 'mes' : 'meses'}
              </Text>
            </View>
          )}
          {goal.months_to_goal === 0 && (
            <View style={[styles.timeChip, { backgroundColor: Colors.successBg }]}>
              <Ionicons name="checkmark-circle" size={11} color={Colors.success} />
              <Text style={[styles.timeText, { color: Colors.success }]}>Meta alcanzada</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    savings: 'Ahorro',
    debt_payoff: 'Pago deuda',
    investment: 'Inversión',
    emergency_fund: 'Fondo emergencia',
    purchase: 'Compra',
    retirement: 'Jubilación',
    travel: 'Viaje',
    education: 'Educación',
    other: 'Otro',
  };
  return map[type] || type;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inner: { padding: Spacing.md },

  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  iconBg: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  titleBlock: { flex: 1 },
  name: { color: Colors.textPrimary, fontSize: Typography.base, fontWeight: Typography.semibold },
  type: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  pctBlock: {},
  pct: { fontSize: Typography.lg, fontWeight: Typography.bold },

  barBg: {
    height: 8, backgroundColor: Colors.surfaceMid,
    borderRadius: BorderRadius.full, overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  barFill: { height: '100%', borderRadius: BorderRadius.full },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  current: { color: Colors.textPrimary, fontSize: Typography.xs, fontWeight: Typography.semibold },
  separator: { color: Colors.textMuted, fontSize: Typography.xs },
  target: { color: Colors.textMuted, fontSize: Typography.xs, flex: 1 },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.surfaceMid, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  timeText: { color: Colors.textMuted, fontSize: 10 },
});
