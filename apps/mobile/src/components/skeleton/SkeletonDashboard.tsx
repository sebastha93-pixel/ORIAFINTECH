import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SkeletonBox } from './SkeletonBase';
import { SkeletonNetWorth } from './SkeletonNetWorth';
import { SkeletonAccountCard } from './SkeletonAccountCard';
import { SkeletonTransactionList } from './SkeletonTransactionList';

// Full dashboard skeleton composition
export function SkeletonDashboard() {
  return (
    <ScrollView
      style={s.root}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    >
      {/* Header area */}
      <View style={s.header}>
        {/* Top bar */}
        <View style={s.topBar}>
          <SkeletonBox width={90} height={28} borderRadius={8} />
          <SkeletonBox width={36} height={36} borderRadius={18} />
        </View>
        {/* Greeting */}
        <SkeletonBox width={180} height={18} borderRadius={6} style={s.greeting} />
        <SkeletonBox width={110} height={13} borderRadius={5} style={s.greetingSub} />
        {/* Hero card */}
        <SkeletonNetWorth />
      </View>

      {/* Stats row */}
      <View style={s.statsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={s.statCard}>
            <SkeletonBox width={28} height={28} borderRadius={6} style={s.statIcon} />
            <SkeletonBox width={70} height={15} borderRadius={6} style={s.mb6} />
            <SkeletonBox width={50} height={11} borderRadius={5} style={s.mb6} />
            <SkeletonBox width={55} height={11} borderRadius={5} />
          </View>
        ))}
      </View>

      {/* Accounts section */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <SkeletonBox width={100} height={16} borderRadius={6} />
          <SkeletonBox width={60} height={12} borderRadius={5} />
        </View>
        <View style={s.accountsRow}>
          {[0, 1, 2].map((i) => (
            <SkeletonAccountCard key={i} />
          ))}
        </View>
      </View>

      {/* Transactions section */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <SkeletonBox width={150} height={16} borderRadius={6} />
          <SkeletonBox width={60} height={12} borderRadius={5} />
        </View>
        <SkeletonTransactionList rows={5} />
      </View>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0C0F' },
  header: { paddingTop: 56, paddingBottom: 24 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  greeting: { marginHorizontal: 24, marginBottom: 8 },
  greetingSub: { marginHorizontal: 24, marginBottom: 20 },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#111419',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2530',
  },
  statIcon: { marginBottom: 10 },
  mb6: { marginBottom: 6 },
  section: { paddingHorizontal: 16, marginTop: 28 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  accountsRow: { flexDirection: 'row', gap: 10 },
});
