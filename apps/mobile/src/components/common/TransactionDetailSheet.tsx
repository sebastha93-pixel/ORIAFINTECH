import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Transaction } from '../../types';

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
  visible: boolean;
  onClose: () => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  Salario: '💼', Freelance: '💻', Inversiones: '📈',
  Vivienda: '🏠', Alimentación: '🍽️', Transporte: '🚗',
  Entretenimiento: '🎮', Salud: '🏥', Educación: '🎓',
  Ropa: '👕', Tecnología: '📱', Viajes: '✈️',
  Deporte: '🏋️', Mascotas: '🐾', Regalos: '🎁',
  Suscripciones: '🔄', Impuestos: '📄',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export function TransactionDetailSheet({
  transaction,
  visible,
  onClose,
}: TransactionDetailSheetProps) {
  if (!transaction) return null;

  const isIncome = transaction.transaction_type === 'income';
  const isTransfer = transaction.transaction_type === 'transfer';
  const amountColor = isIncome ? '#00E5A0' : isTransfer ? '#4A9EFF' : '#EF4444';
  const amountSign = isIncome ? '+' : isTransfer ? '' : '-';

  const cat = transaction.category as { name: string; icon: string; color: string } | null;
  const acc = transaction.account as { name: string } | null;
  const catName = cat?.name || '';
  const emoji = CATEGORY_EMOJIS[catName] || (isIncome ? '💰' : '💸');

  const typeLabel = isIncome ? 'Ingreso' : isTransfer ? 'Transferencia' : 'Gasto';
  const statusLabel = 'Completado';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Semi-transparent overlay */}
      <Pressable style={sh.overlay} onPress={onClose}>
        <Pressable style={sh.sheet} onPress={() => {}}>
          {/* Drag handle */}
          <View style={sh.handle} />

          {/* Category emoji icon */}
          <View style={sh.emojiWrap}>
            <Text style={sh.emoji}>{emoji}</Text>
          </View>

          {/* Merchant name */}
          <Text style={sh.merchant} numberOfLines={2}>
            {transaction.description || catName || 'Transacción'}
          </Text>

          {/* Amount */}
          <Text style={[sh.amount, { color: amountColor }]}>
            {amountSign}{fmt(transaction.amount)}
          </Text>

          {/* 2×2 metadata grid */}
          <View style={sh.metaGrid}>
            <MetaCell label="Fecha" value={fmtDate(transaction.date)} />
            <MetaCell label="Cuenta" value={acc?.name || '—'} />
            <MetaCell label="Tipo" value={typeLabel} />
            <MetaCell label="Estado" value={statusLabel} />
          </View>

          {/* Category row */}
          {catName ? (
            <View style={sh.catRow}>
              <Text style={sh.catLabel}>Categoría</Text>
              <View style={[sh.catBadge, { backgroundColor: cat?.color ? cat.color + '30' : '#2A1D00' }]}>
                <Text style={[sh.catBadgeText, { color: cat?.color || '#F5A623' }]}>
                  {catName}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Action buttons */}
          <View style={sh.actions}>
            <Pressable
              style={({ pressed }) => [sh.actionBtn, sh.actionBtnSecondary, pressed && sh.pressed]}
              onPress={onClose}
            >
              <Text style={sh.actionBtnSecText}>Editar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [sh.actionBtn, sh.actionBtnAccent, pressed && sh.pressed]}
              onPress={onClose}
            >
              <Text style={sh.actionBtnAccentText}>Dividir gasto</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={sh.metaCell}>
      <Text style={sh.metaCellLabel}>{label}</Text>
      <Text style={sh.metaCellValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111419',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E2530',
    alignItems: 'center',
  },

  handle: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#1E2530',
    marginBottom: 20,
  },

  emojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#1A1E25',
    borderWidth: 1,
    borderColor: '#1E2530',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: { fontSize: 26 },

  merchant: {
    fontSize: 17,
    fontWeight: '700',
    color: '#E8E4DC',
    textAlign: 'center',
    marginBottom: 6,
  },

  amount: {
    fontSize: 28,
    fontWeight: '400',
    // DM Mono-like — mono spacing
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    marginBottom: 24,
  },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  metaCell: {
    width: '47%',
    backgroundColor: '#1A1E25',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E2530',
  },
  metaCellLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metaCellValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E8E4DC',
  },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  catLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnSecondary: {
    backgroundColor: '#1A1E25',
    borderWidth: 1,
    borderColor: '#1E2530',
  },
  actionBtnAccent: {
    backgroundColor: '#00E5A0',
  },
  actionBtnSecText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8E4DC',
  },
  actionBtnAccentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0C0F',
  },
  pressed: {
    opacity: 0.75,
  },
});
