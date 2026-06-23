import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <View style={s.container}>
      {/* Icon in 56x56 rounded square */}
      <View style={s.iconWrap}>{icon}</View>

      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>

      {ctaLabel && onCta && (
        <Pressable
          style={({ pressed }) => [s.cta, { opacity: pressed ? 0.82 : 1 }]}
          onPress={onCta}
        >
          <Text style={s.ctaText}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },

  // 56×56px rounded square — bg surface-2, border
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#1A1E25',
    borderWidth: 1,
    borderColor: '#1E2530',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E8E4DC',
    textAlign: 'center',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },

  cta: {
    backgroundColor: '#00E5A0',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },

  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0C0F',
  },
});
