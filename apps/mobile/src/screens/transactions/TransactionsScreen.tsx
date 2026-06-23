import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, RefreshControl, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { api } from '../../services/api';
import { Transaction } from '../../types';
import { TransactionRow } from '../../components/common/TransactionRow';
import { TransactionDetailSheet } from '../../components/common/TransactionDetailSheet';
import { SkeletonTransactionList } from '../../components/skeleton';
import { EmptyState } from '../../components/common/EmptyState';

// ─── helpers ───────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

// Flat list item for getItemLayout — each transaction row is 56px
// Date headers are approximated at 32px
type FlatItem =
  | { kind: 'header'; date: string; label: string }
  | { kind: 'row'; transaction: Transaction };

const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 32;

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

  // Detail sheet state
  const [selectedTx, setSelectedTx]   = useState<Transaction | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

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

  // Build flat items array for FlatList with getItemLayout support
  const flatItems = useCallback((): FlatItem[] => {
    const result: FlatItem[] = [];
    const grouped: Record<string, Transaction[]> = {};
    transactions.forEach((t) => {
      const key = t.date.slice(0, 10);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });
    Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([date, items]) => {
        const d = new Date(date + 'T12:00:00');
        const label = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' });
        result.push({ kind: 'header', date, label });
        items.forEach((t) => result.push({ kind: 'row', transaction: t }));
      });
    return result;
  }, [transactions]);

  const items = flatItems();

  const getItemLayout = useCallback(
    (_: any, index: number) => {
      let offset = 0;
      let length = ROW_HEIGHT;
      for (let i = 0; i < index; i++) {
        const item = items[i];
        offset += item?.kind === 'header' ? HEADER_HEIGHT : ROW_HEIGHT;
      }
      if (items[index]?.kind === 'header') length = HEADER_HEIGHT;
      return { length, offset, index };
    },
    [items]
  );

  const openDetail = useCallback((tx: Transaction) => {
    setSelectedTx(tx);
    setSheetVisible(true);
  }, []);

  const closeDetail = useCallback(() => {
    setSheetVisible(false);
  }, []);

  const renderItem = useCallback(({ item }: { item: FlatItem }) => {
    if (item.kind === 'header') {
      return <Text style={s.dateLabel}>{item.label}</Text>;
    }
    return (
      <TransactionRow
        transaction={item.transaction}
        currency="COP"
        onPress={() => openDetail(item.transaction)}
      />
    );
  }, [openDetail]);

  const keyExtractor = useCallback((item: FlatItem) => {
    return item.kind === 'header' ? `h-${item.date}` : `r-${item.transaction.id}`;
  }, []);

  return (
    <View style={s.root}>
      {/* Header */}
      <LinearGradient colors={['#0D1B3E', Colors.background]} style={s.header}>
        <Text style={s.headerTitle}>Movimientos</Text>

        {/* Summary pills */}
        <View style={s.summaryRow}>
          <View style={[s.summaryPill, { backgroundColor: Colors.successBg }]}>
            <Ionicons name="arrow-down" size={12} color={Colors.accent} />
            <Text style={[s.summaryVal, { color: Colors.accent }]}>{fmt(income)}</Text>
          </View>
          <View style={[s.summaryPill, { backgroundColor: Colors.dangerBg }]}>
            <Ionicons name="arrow-up" size={12} color={Colors.danger} />
            <Text style={[s.summaryVal, { color: Colors.danger }]}>{fmt(expense)}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search */}
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

      {/* Filter tabs */}
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

      {/* List */}
      {isLoading ? (
        <SkeletonTransactionList rows={7} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="swap-horizontal" size={28} color={Colors.accent} />}
          title={filter === 'income' ? 'Sin ingresos' : filter === 'expense' ? 'Sin gastos' : 'Sin movimientos'}
          subtitle={
            filter === 'income' ? 'No tienes ingresos registrados este período.'
            : filter === 'expense' ? 'No tienes gastos registrados este período.'
            : 'Usa el botón + para registrar tu primer movimiento.'
          }
          ctaLabel={filter === 'all' ? 'Agregar movimiento' : undefined}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
          onEndReached={() => hasMore && load()}
          onEndReachedThreshold={0.4}
          removeClippedSubviews
        />
      )}

      {/* Transaction Detail Sheet */}
      <TransactionDetailSheet
        transaction={selectedTx}
        visible={sheetVisible}
        onClose={closeDetail}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: Typography.bold },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  summaryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  summaryVal: { fontSize: Typography.xs, fontWeight: Typography.semibold },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
    height: 44,
  },
  searchIcon: { marginRight: Spacing.xs },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.base },

  filterRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 3,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterTab: {
    flex: 1, paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  filterTabActive: { backgroundColor: Colors.accent },
  filterTabText: { color: Colors.textMuted, fontSize: Typography.sm, fontWeight: Typography.medium },
  filterTabTextActive: { color: '#fff', fontWeight: Typography.semibold },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },

  dateLabel: {
    color: Colors.textMuted, fontSize: Typography.xs,
    fontWeight: Typography.semibold, textTransform: 'uppercase',
    letterSpacing: 0.8,
    height: HEADER_HEIGHT,
    lineHeight: HEADER_HEIGHT,
    paddingTop: 8,
  },
});
