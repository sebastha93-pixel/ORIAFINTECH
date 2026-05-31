import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AiInsight } from '@nexo/shared';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';

const SEVERITY_CONFIG = {
  success: { color: Colors.success, icon: 'checkmark-circle', bg: Colors.success + '15' },
  warning: { color: Colors.warning, icon: 'warning', bg: Colors.warning + '15' },
  alert: { color: Colors.danger, icon: 'alert-circle', bg: Colors.danger + '15' },
  info: { color: Colors.info, icon: 'information-circle', bg: Colors.info + '15' },
} as const;

export function InsightCard({ insight, onDismiss }: { insight: AiInsight; onDismiss?: (id: string) => void }) {
  const config = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.info;

  return (
    <View style={[styles.card, { borderLeftColor: config.color }]}>
      <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon as 'checkmark-circle'} size={20} color={config.color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.description}>{insight.description}</Text>
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={() => onDismiss(insight.id)} style={styles.dismissBtn}>
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  content: { flex: 1 },
  title: { color: Colors.textPrimary, fontSize: Typography.sm, fontWeight: Typography.semibold, marginBottom: 2 },
  description: { color: Colors.textSecondary, fontSize: Typography.xs, lineHeight: 18 },
  dismissBtn: { padding: 2 },
});
