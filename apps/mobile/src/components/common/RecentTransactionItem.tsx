import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../../types';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatCurrency, formatDate } from '../../utils/format';

export function RecentTransactionItem({ transaction, currency }: { transaction: Transaction; currency: string }) {
  const isIncome = transaction.transaction_type === 'income';
  const isTransfer = transaction.transaction_type === 'transfer';
  const amountColor = isIncome ? Colors.success : isTransfer ? Colors.info : Colors.danger;
  const amountSign = isIncome ? '+' : isTransfer ? '' : '-';

  const cat = transaction.category as { name: string; icon: string; color: string } | null;
  const acc = transaction.account as { name: string; icon: string; color: string } | null;

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: (cat?.color || Colors.primary) + '20' }]}>
        <Ionicons
          name={((cat?.icon || 'swap-horizontal') as 'swap-horizontal')}
          size={18}
          color={cat?.color || Colors.primary}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description || cat?.name || 'Sin descripción'}
        </Text>
        <Text style={styles.meta}>
          {acc?.name || 'Cuenta'} · {formatDate(transaction.date, 'D MMM')}
        </Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {amountSign}{formatCurrency(transaction.amount, currency, true)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  icon: { width: 40, height: 40, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  description: { color: Colors.textPrimary, fontSize: Typography.sm, fontWeight: Typography.medium },
  meta: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 1 },
  amount: { fontSize: Typography.sm, fontWeight: Typography.bold },
});
