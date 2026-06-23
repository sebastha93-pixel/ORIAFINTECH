import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal } from '../../types';
import { Colors, Spacing, Typography, BorderRadius, NumberTextStyles } from '../../theme';
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
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.72, transform: [{ scale: 0.97 }] },
      ]}
      onPress={onPress}
    >
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconBg, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon as 'flag'} size={18} color={color} />
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.name}>{goal.name}</Text>
            <Text style={styles.type}>{typeLabel(goal.goal_type)}</Text>
          </View>

          <Text style={[styles.pct, { color }]}>{progress.toFixed(0)}%</Text>
        </View>

        {/* Progress bar — accent or goal color */}
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
            <View style={[styles.timeChip, { backgroundColor: Colors.accentBg }]}>
              <Ionicons name="checkmark-circle" size={11} color={Colors.accent} />
              <Text style={[styles.timeText, { color: Colors.accent }]}>Meta alcanzada</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
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
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  inner: { padding: Spacing.md },

  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  iconBg: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  titleBlock: { flex: 1 },
  name: {
    color: Colors.textPrimary, fontSize: Typography.base,
    fontWeight: Typography.semibold, fontFamily: Typography.fontSansSemibold,
  },
  type: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  // Percentage in DM Sans 600
  pct: { ...NumberTextStyles.percentageLg, fontSize: Typography.lg },

  barBg: {
    height: 6, backgroundColor: Colors.border,
    borderRadius: 3, overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  barFill: { height: '100%', borderRadius: 3 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  current: { ...NumberTextStyles.amountSm, color: Colors.textPrimary },
  separator: { color: Colors.textMuted, fontSize: Typography.xs },
  target: { ...NumberTextStyles.amountSm, color: Colors.textMuted, flex: 1 },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  timeText: { color: Colors.textMuted, fontSize: 10 },
});
