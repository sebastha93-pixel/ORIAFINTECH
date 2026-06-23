import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Account } from '../../types';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatCurrency } from '../../utils/format';

const ACCOUNT_ICONS: Record<string, string> = {
  checking: 'card',
  savings: 'wallet',
  credit_card: 'card',
  investment: 'trending-up',
  crypto: 'logo-bitcoin',
  cash: 'cash',
  loan: 'alert-circle',
  other: 'ellipsis-horizontal',
};

const ACCOUNT_LABELS: Record<string, string> = {
  checking: 'Corriente',
  savings: 'Ahorros',
  credit_card: 'Crédito',
  investment: 'Inversión',
  crypto: 'Crypto',
  cash: 'Efectivo',
  loan: 'Préstamo',
  other: 'Otro',
};

export function AccountCard({
  account,
  currency,
  onPress,
}: {
  account: Account;
  currency: string;
  onPress?: () => void;
}) {
  const isNegative = Number(account.current_balance) < 0;
  const cardColor = account.color || Colors.accounts[account.account_type] || Colors.primary;
  const iconName = ACCOUNT_ICONS[account.account_type] || 'card';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.wrapper,
        {
          opacity: pressed ? 0.72 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      <LinearGradient
        colors={[cardColor + 'CC', cardColor + '88']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Top row */}
        <View style={styles.top}>
          <View style={styles.iconWrap}>
            <Ionicons name={iconName as 'card'} size={18} color="#fff" />
          </View>
          <Text style={styles.type}>{ACCOUNT_LABELS[account.account_type]}</Text>
        </View>

        {/* Institution */}
        {account.institution && (
          <Text style={styles.institution} numberOfLines={1}>
            {account.institution}
          </Text>
        )}

        {/* Name */}
        <Text style={styles.name} numberOfLines={1}>{account.name}</Text>

        {/* Balance */}
        <Text style={[styles.balance, isNegative && { color: '#FDA4AF' }]}>
          {formatCurrency(Number(account.current_balance), currency, true)}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  card: {
    width: 140,
    padding: Spacing.md,
    gap: 4,
    borderRadius: BorderRadius.lg,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  iconWrap: {
    width: 28, height: 28, borderRadius: BorderRadius.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  type: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.xs },
  institution: { color: 'rgba(255,255,255,0.6)', fontSize: Typography.xs },
  name: { color: '#fff', fontSize: Typography.sm, fontWeight: Typography.semibold },
  balance: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold, marginTop: 4 },
});
