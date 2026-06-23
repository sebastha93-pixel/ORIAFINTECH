import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../../types';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatCurrency, formatDate } from '../../utils/format';

function TransactionRowBase({
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

  const amountColor = isIncome ? Colors.success : isTransfer ? Colors.info : Colors.danger;
  const amountSign  = isIncome ? '+' : isTransfer ? '' : '-';

  const cat = transaction.category as { name: string; icon: string; color: string } | null;
  const acc = transaction.account  as { name: string } | null;

  const iconName  = cat?.icon  || (isTransfer ? 'swap-horizontal' : isIncome ? 'arrow-down-circle' : 'arrow-up-circle');
  const iconColor = cat?.color || amountColor;

  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        {
          opacity: pressed ? 0.72 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      onPress={handlePress}
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
    </Pressable>
  );
}

export const TransactionRow = React.memo(TransactionRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 56, // fixed 56px height per DESIGN.md
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  info: { flex: 1 },
  desc: { color: Colors.textPrimary, fontSize: Typography.sm, fontWeight: Typography.medium },
  meta: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: Typography.sm, fontWeight: Typography.bold },
  category: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 1 },
});
