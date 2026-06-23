import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox } from './SkeletonBase';

// Card shimmer: logo + name + balance
export function SkeletonAccountCard() {
  return (
    <View style={s.card}>
      {/* Logo */}
      <SkeletonBox width={28} height={28} borderRadius={6} style={s.logo} />
      {/* Name */}
      <SkeletonBox width={80} height={12} borderRadius={6} style={s.name} />
      {/* Suffix */}
      <SkeletonBox width={55} height={10} borderRadius={5} style={s.suffix} />
      {/* Balance */}
      <SkeletonBox width={100} height={17} borderRadius={6} style={s.balance} />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    width: 140,
    padding: 14,
    backgroundColor: '#111419',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2530',
    gap: 0,
  },
  logo: { marginBottom: 8 },
  name: { marginBottom: 5 },
  suffix: { marginBottom: 12 },
  balance: {},
});
