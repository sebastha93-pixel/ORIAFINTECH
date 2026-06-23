import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AiInsight } from '../../types';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';

const SEVERITY: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  success: { color: Colors.accent,   bg: Colors.accentBg,  icon: 'trending-up',        label: 'Positivo' },
  warning: { color: Colors.amber,    bg: Colors.amberBg,   icon: 'warning',             label: 'Atención' },
  alert:   { color: Colors.danger,   bg: Colors.dangerBg,  icon: 'alert-circle',        label: 'Alerta'   },
  info:    { color: Colors.info,     bg: Colors.infoBg,    icon: 'information-circle',  label: 'Consejo'  },
};

export function InsightCard({
  insight,
  onDismiss,
  onPress,
}: {
  insight: AiInsight;
  onDismiss?: (id: string) => void;
  onPress?: (insight: AiInsight) => void;
}) {
  const cfg = SEVERITY[insight.severity] || SEVERITY.info;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.72, transform: [{ scale: 0.97 }] },
      ]}
      onPress={() => onPress?.(insight)}
    >
      {/* Left accent bar */}
      <View style={[styles.accent, { backgroundColor: cfg.color }]} />

      <View style={styles.body}>
        {/* Severity chip (amber tag) + dismiss */}
        <View style={styles.topRow}>
          <View style={[styles.chip, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as 'warning'} size={11} color={cfg.color} />
            <Text style={[styles.chipText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          {onDismiss && (
            <Pressable
              onPress={() => onDismiss(insight.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Content */}
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.description}>{insight.description}</Text>

        {/* Footer: ORIA IA label + accent arrow */}
        <View style={styles.footer}>
          <Ionicons name="sparkles" size={12} color={Colors.accent} />
          <Text style={styles.footerText}>ORIA IA</Text>
          <Text style={styles.arrow}>Ver análisis completo →</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accent: { width: 4 },
  body: { flex: 1, padding: Spacing.md, gap: Spacing.xs },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  chipText: { fontSize: 10, fontWeight: Typography.semibold, fontFamily: Typography.fontSansSemibold },

  title: {
    color: Colors.textPrimary, fontSize: Typography.sm,
    fontWeight: Typography.bold, fontFamily: Typography.fontSansBold,
  },
  description: { color: Colors.textSecondary, fontSize: Typography.xs, lineHeight: 18 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  footerText: { color: Colors.accent, fontSize: Typography.xs, fontWeight: Typography.medium, flex: 1 },
  // Accent arrow
  arrow: { color: Colors.accent, fontSize: Typography.xs },
});
