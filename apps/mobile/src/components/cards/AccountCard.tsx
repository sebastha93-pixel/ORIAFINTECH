import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from '../../types';
import { Colors, Spacing, Typography, BorderRadius, NumberTextStyles } from '../../theme';
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
  // Use ORIA account colors from theme, fallback to accent
  const cardColor = account.color || (Colors.accounts as Record<string, string>)[account.account_type] || Colors.accent;
  const iconName = ACCOUNT_ICONS[account.account_type] || 'card';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.wrapper,
        pressed && { opacity: 0.72, transform: [{ scale: 0.97 }] },
      ]}
      onPress={onPress}
    >
      {/* Flat surface card with colored left accent */}
      <View style={styles.card}>
        {/* Left color accent strip */}
        <View style={[styles.accentBar, { backgroundColor: cardColor }]} />

        <View style={styles.content}>
          {/* Bank logo circle + type */}
          <View style={styles.top}>
            <View style={[styles.logoCircle, { backgroundColor: cardColor + '20' }]}>
              <Ionicons name={iconName as 'card'} size={16} color={cardColor} />
            </View>
            <View>
              <Text style={styles.type}>{ACCOUNT_LABELS[account.account_type]}</Text>
              {account.institution && (
                <Text style={styles.institution} numberOfLines={1}>{account.institution}</Text>
              )}
            </View>
          </View>

          {/* Account name */}
          <Text style={styles.name} numberOfLines={1}>{account.name}</Text>

          {/* Balance — DM Sans 500 tabular */}
          <Text style={[styles.balance, isNegative && { color: Colors.danger }]}>
            {formatCurrency(Number(account.current_balance), currency, true)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: 8, overflow: 'hidden' },
  card: {
    width: 140,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  // Left accent strip
  accentBar: { width: 3 },
  content: { flex: 1, padding: Spacing.md, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  logoCircle: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  type: { color: Colors.textSecondary, fontSize: Typography.xs },
  institution: { color: Colors.textMuted, fontSize: 10 },
  name: {
    color: Colors.textPrimary, fontSize: Typography.sm,
    fontWeight: Typography.semibold, fontFamily: Typography.fontSansSemibold,
  },
  balance: {
    ...NumberTextStyles.amount,
    color: Colors.textPrimary, fontSize: Typography.sm, marginTop: 4,
  },
});
