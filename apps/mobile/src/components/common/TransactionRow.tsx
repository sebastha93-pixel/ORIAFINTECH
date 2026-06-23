import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../../types';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatCurrency, formatDate } from '../../utils/format';

export function TransactionRow({
  transaction,
  currency,
  onPress,
}: {
  transaction: Transaction;
  currency: string;
  onPress?: () => void;
}) {
  const isIncome   = transaction.transaction_type === 'income';
  const isTransfer = transaction.transaction_type === 'transfer';

  // ORIA: income = accent, expense = textPrimary (not red), transfer = textSecondary
  const amountColor = isIncome ? Colors.accent : isTransfer ? Colors.textSecondary : Colors.textPrimary;
  const amountSign  = isIncome ? '+' : isTransfer ? '' : '-';

  const cat = transaction.category as { name: string; icon: string; color: string } | null;
  const acc = transaction.account  as { name: string } | null;

  const iconName  = cat?.icon  || (isTransfer ? 'swap-horizontal' : isIncome ? 'arrow-down-circle' : 'arrow-up-circle');
  const iconColor = cat?.color || amountColor;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={[styles.icon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={iconName as 'swap-horizontal'} size={18} color={iconColor} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.desc} numberOfLines={1}>
          {transaction.description || cat?.name || 'Sin descripción'}
        </Text>
        <Text style={styles.meta}>
          {acc?.name || 'Cuenta'} · {formatDate(transaction.date, 'D MMM')}
        </Text>
      </View>

      {/* Amount */}
      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {amountSign}{formatCurrency(transaction.amount, currency, true)}
        </Text>
        {cat?.name && (
          <Text style={styles.category} numberOfLines={1}>{cat.name}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ORIA: exactly 56px row height, flat
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  icon: {
    width: 36, height: 36,
    borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  info: { flex: 1 },
  desc: { color: Colors.textPrimary, fontSize: Typography.sm, fontWeight: Typography.medium },
  meta: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  amount: {
    fontFamily: Typography.fontSansMedium,
    fontWeight: '500' as const,
    fontVariant: ['tabular-nums'] as const,
    fontSize: Typography.sm,
  },
  category: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 1 },
});
