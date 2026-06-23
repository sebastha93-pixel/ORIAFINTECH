import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox } from './SkeletonBase';

// Row shimmer: icon + name + date + amount — fixed 56px height
export function SkeletonTransactionRow() {
  return (
    <View style={s.row}>
      {/* Icon */}
      <SkeletonBox width={32} height={32} borderRadius={8} />
      {/* Info */}
      <View style={s.info}>
        <SkeletonBox width={130} height={13} borderRadius={6} style={s.mb4} />
        <SkeletonBox width={80} height={10} borderRadius={5} />
      </View>
      {/* Amount */}
      <SkeletonBox width={70} height={13} borderRadius={6} />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2530',
  },
  info: { flex: 1 },
  mb4: { marginBottom: 4 },
});
