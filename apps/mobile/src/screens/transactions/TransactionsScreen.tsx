import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, ActivityIndicator, RefreshControl, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, NumberTextStyles } from '../../theme';
import { api } from '../../services/api';
import { Transaction } from '../../types';
import { AddTransactionScreen } from './AddTransactionScreen';

// ─── helpers ───────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

const groupByDate = (txns: Transaction[]) => {
  const map: Record<string, Transaction[]> = {};
  txns.forEach((t) => {
    const key = t.date.slice(0, 10);
    if (!map[key]) map[key] = [];
    map[key].push(t);
  });
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
};

const CATEGORY_ICONS: Record<string, string> = {
  Salario: 'briefcase', Freelance: 'laptop', Inversiones: 'trending-up',
  Vivienda: 'home', Alimentación: 'restaurant', Transporte: 'car',
  Entretenimiento: 'game-controller', Salud: 'medkit', Educación: 'school',
  Ropa: 'shirt', Tecnología: 'phone-portrait', Viajes: 'airplane',
  Deporte: 'fitness', Mascotas: 'paw', Regalos: 'gift',
  Suscripciones: 'repeat', Impuestos: 'document-text',
};

// Row height constant for FlatList
const ROW_HEIGHT = 56;

// ─── Component ─────────────────────────────────────────────
type FilterType = 'all' | 'income' | 'expense';

export function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter]             = useState<FilterType>('all');
  const [search, setSearch]             = useState('');
  const [isLoading, setIsLoading]       = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(true);
  const [income, setIncome]             = useState(0);
  const [expense, setExpense]           = useState(0);
  const [showAdd, setShowAdd]           = useState(false);

  const load = useCallback(async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const res = await api.getTransactions({
        transaction_type: filter === 'all' ? undefined : filter,
        search: search || undefined,
        page: currentPage,
        limit: 30,
      });
      const items = res.data;
      if (reset) {
        setTransactions(items);
        setPage(2);
      } else {
        setTransactions((prev) => [...prev, ...items]);
        setPage(currentPage + 1);
      }
      setHasMore(items.length === 30);

      if (reset || filter !== 'all') {
        const inc = items.filter((t) => t.transaction_type === 'income').reduce((s, t) => s + t.amount, 0);
        const exp = items.filter((t) => t.transaction_type === 'expense').reduce((s, t) => s + t.amount, 0);
        setIncome(inc);
        setExpense(exp);
      }
    } catch {
      // silently fail — keep showing cached data
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filter, search, page]);

  useEffect(() => {
    setIsLoading(true);
    setTransactions([]);
    setPage(1);
    setHasMore(true);
    load(true);
  }, [filter, search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  // ── Render helpers ────────────────────────────────────────
  const renderTxn = (item: Transaction) => {
    const isIncome   = item.transaction_type === 'income';
    const isTransfer = item.transaction_type === 'transfer';
    const catName    = item.category?.name || '';
    const iconName   = CATEGORY_ICONS[catName] || (isIncome ? 'arrow-down-circle' : 'arrow-up-circle');
    const iconColor  = item.category?.color || (isIncome ? Colors.accent : Colors.textMuted);

    // Amount color: income = accent, expense = textPrimary, transfer = textSecondary
    const amtColor = isIncome ? Colors.accent : isTransfer ? Colors.textSecondary : Colors.textPrimary;
    const amtPrefix = isIncome ? '+' : isTransfer ? '' : '-';

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          s.txnRow,
          pressed && { opacity: 0.72, transform: [{ scale: 0.97 }] },
        ]}
      >
        <View style={[s.txnIcon, { backgroundColor: (item.category?.color || iconColor) + '20' }]}>
          <Ionicons name={iconName as 'home'} size={18} color={iconColor} />
        </View>
        <View style={s.txnMeta}>
          <Text style={s.txnDesc} numberOfLines={1}>
            {item.description || catName || 'Transacción'}
          </Text>
          <Text style={s.txnSub}>
            {item.account?.name || '—'}  ·  {fmtDate(item.date)}
          </Text>
        </View>
        <Text style={[s.txnAmt, { color: amtColor }]}>
          {amtPrefix}{fmt(item.amount)}
        </Text>
      </Pressable>
    );
  };

  const groups = groupByDate(transactions);

  const renderSection = ({ item: [date, items] }: { item: [string, Transaction[]] }) => {
    const d = new Date(date + 'T12:00:00');
    const label = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' });
    return (
      <View>
        {/* Month section header: DM Mono 9px uppercase muted */}
        <Text style={s.dateLabel}>{label}</Text>
        <View style={s.dayGroup}>
          {items.map((t, i) => (
            <View key={t.id}>
              {renderTxn(t)}
              {/* Flat divider between rows */}
              {i < items.length - 1 && <View style={s.rowDivider} />}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={s.root}>
      {/* ── HEADER — flat bg, no gradient ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Movimientos</Text>

        {/* Summary pills */}
        <View style={s.summaryRow}>
          <View style={[s.summaryPill, { backgroundColor: Colors.accentBg }]}>
            <Ionicons name="arrow-down" size={12} color={Colors.accent} />
            <Text style={[s.summaryVal, { color: Colors.accent }]}>{fmt(income)}</Text>
          </View>
          <View style={[s.summaryPill, { backgroundColor: Colors.dangerBg }]}>
            <Ionicons name="arrow-up" size={12} color={Colors.danger} />
            <Text style={[s.summaryVal, { color: Colors.danger }]}>{fmt(expense)}</Text>
          </View>
        </View>
      </View>

      {/* ── SEARCH ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar movimientos..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* ── FILTER CHIPS ── */}
      <View style={s.filterRow}>
        {(['all', 'income', 'expense'] as FilterType[]).map((f) => (
          <Pressable
            key={f}
            style={({ pressed }) => [
              s.filterTab,
              filter === f && s.filterTabActive,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterTabText, filter === f && s.filterTabTextActive]}>
              {f === 'all' ? 'Todos' : f === 'income' ? 'Ingresos' : 'Gastos'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── LIST ── */}
      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />
      ) : transactions.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="list-outline" size={32} color={Colors.textMuted} />
          </View>
          <Text style={s.emptyTitle}>
            {filter === 'income' ? 'Sin ingresos'
              : filter === 'expense' ? 'Sin gastos'
              : 'Sin movimientos'}
          </Text>
          <Text style={s.emptySub}>
            {filter === 'income' ? 'No tienes ingresos registrados este período.'
              : filter === 'expense' ? 'No tienes gastos registrados este período.'
              : 'Usa el botón + para registrar tu primer movimiento.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={([date]) => date}
          renderItem={renderSection}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
          onEndReached={() => hasMore && load()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            hasMore
              ? <ActivityIndicator color={Colors.accent} style={{ marginVertical: 16 }} />
              : null
          }
        />
      )}

      {/* ── FAB + button (bottom-right, above nav) ── */}
      <Pressable
        style={({ pressed }) => [
          s.fab,
          pressed && { opacity: 0.72, transform: [{ scale: 0.97 }] },
        ]}
        onPress={() => setShowAdd(true)}
      >
        <Ionicons name="add" size={26} color={Colors.background} />
      </Pressable>

      {/* Add Transaction modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <AddTransactionScreen
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(true); }}
        />
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header — flat, no gradient
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  headerTitle: {
    color: Colors.textPrimary, fontSize: Typography.xl,
    fontWeight: Typography.bold, fontFamily: Typography.fontSansBold,
  },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  summaryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  summaryVal: {
    ...NumberTextStyles.percentageSm,
    fontSize: Typography.xs,
  },

  // Search — surface2 bg
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceMid,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderLight,
    height: 44,
  },
  searchIcon: { marginRight: Spacing.xs },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.base },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterTab: {
    flex: 1, paddingVertical: Spacing.xs + 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterTabActive: { backgroundColor: Colors.accent },
  filterTabText: { color: Colors.textMuted, fontSize: Typography.sm, fontWeight: Typography.medium },
  filterTabTextActive: { color: Colors.background, fontWeight: Typography.semibold },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },

  // Month section header: DM Mono 9px uppercase muted
  dateLabel: {
    color: Colors.textMuted, fontSize: 9,
    fontFamily: Typography.fontMono,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: Spacing.md, marginBottom: 4,
  },

  // Day group container with rounded corners
  dayGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },

  // Transaction row — exactly 56px, flat
  txnRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    height: ROW_HEIGHT,
    paddingHorizontal: Spacing.md,
  },
  // Divider between rows (no divider after last row)
  rowDivider: {
    height: 1, backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  txnIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  txnMeta: { flex: 1 },
  txnDesc: { color: Colors.textPrimary, fontSize: Typography.sm, fontWeight: Typography.medium },
  txnSub: { color: Colors.textMuted, fontSize: 10, marginTop: 1 },
  txnAmt: {
    ...NumberTextStyles.amount,
    fontSize: Typography.sm,
  },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: Typography.bold },
  emptySub: { color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center', lineHeight: 22 },

  // FAB — accent bg, bottom-right above nav
  fab: {
    position: 'absolute',
    bottom: 80,
    right: Spacing.lg,
    width: 52, height: 52, borderRadius: 10,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
});
