import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonTransactionRow } from './SkeletonTransactionRow';
import { SkeletonBox } from './SkeletonBase';

// 5-7 skeleton rows with a date label
export function SkeletonTransactionList({ rows = 6 }: { rows?: number }) {
  return (
    <View style={s.container}>
      {/* Date label placeholder */}
      <SkeletonBox width={100} height={10} borderRadius={5} style={s.dateLabel} />
      {/* Transaction rows */}
      <View style={s.card}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTransactionRow key={i} />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 16 },
  dateLabel: { marginVertical: 10 },
  card: {
    backgroundColor: '#111419',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2530',
    overflow: 'hidden',
  },
});
