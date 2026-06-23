import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox } from './SkeletonBase';

// Hero zone shimmer: label + big number + dial placeholder
export function SkeletonNetWorth() {
  return (
    <View style={s.container}>
      {/* Label */}
      <SkeletonBox width={120} height={14} borderRadius={6} style={s.label} />
      {/* Big number */}
      <SkeletonBox width={220} height={36} borderRadius={8} style={s.amount} />
      {/* Change pill */}
      <SkeletonBox width={160} height={22} borderRadius={11} style={s.pill} />
      {/* Dial placeholder */}
      <View style={s.dialRow}>
        <SkeletonBox width={80} height={80} borderRadius={40} />
        <View style={s.dialStats}>
          <SkeletonBox width={90} height={14} borderRadius={6} style={s.mb8} />
          <SkeletonBox width={110} height={14} borderRadius={6} style={s.mb8} />
          <SkeletonBox width={70} height={14} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#111419',
    borderRadius: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1E2530',
  },
  label: { marginBottom: 12 },
  amount: { marginBottom: 10 },
  pill: { marginBottom: 16 },
  dialRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dialStats: { flex: 1 },
  mb8: { marginBottom: 8 },
});
