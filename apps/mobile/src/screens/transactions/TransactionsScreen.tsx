import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { api } from '../../services/api';
import { Transaction } from '@nexo/shared';

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
  const renderTxn = ({ item }: { item: Transaction }) => {
    const isIncome = item.transaction_type === 'income';
    const catName  = item.category?.name || '';
    const iconName = CATEGORY_ICONS[catName] || (isIncome ? 'arrow-down-circle' : 'arrow-up-circle');
    const color    = item.category?.color || (isIncome ? Colors.accent : Colors.danger);

    return (
      <View style={s.txnRow}>
        <View style={[s.txnIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={iconName as 'home'} size={18} color={color} />
        </View>
        <View style={s.txnMeta}>
          <Text style={s.txnDesc} numberOfLines={1}>
            {item.description || catName || 'Transacción'}
          </Text>
          <Text style={s.txnSub}>
            {item.account?.name || '—'}  ·  {fmtDate(item.date)}
          </Text>
        </View>
        <Text style={[s.txnAmt, { color: isIncome ? Colors.accent : Colors.textPrimary }]}>
          {isIncome ? '+' : '-'}{fmt(item.amount)}
        </Text>
      </View>
    );
  };

  const groups = groupByDate(transactions);

  const renderSection = ({ item: [date, items] }: { item: [string, Transaction[]] }) => {
    const d = new Date(date + 'T12:00:00');
    const label = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' });
    return (
      <View>
        <Text style={s.dateLabel}>{label}</Text>
        {items.map((t) => <View key={t.id}>{renderTxn({ item: t })}</View>)}
      </View>
    );
  };

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
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {(['all', 'income', 'expense'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterTab, filter === f && s.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterTabText, filter === f && s.filterTabTextActive]}>
              {f === 'all' ? 'Todos' : f === 'income' ? 'Ingresos' : 'Gastos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />
      ) : transactions.length === 0 ? (
        <EmptyState filter={filter} />
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
          ListFooterComponent={hasMore ? <ActivityIndicator color={Colors.accent} style={{ marginVertical: 16 }} /> : null}
        />
      )}
    </View>
  );
}

function EmptyState({ filter }: { filter: FilterType }) {
  return (
    <View style={s.empty}>
      <LinearGradient colors={[Colors.accent + '20', Colors.primary + '10']} style={s.emptyIcon}>
        <Ionicons name="swap-horizontal" size={32} color={Colors.accent} />
      </LinearGradient>
      <Text style={s.emptyTitle}>Sin movimientos</Text>
      <Text style={s.emptySub}>
        {filter === 'income' ? 'No tienes ingresos registrados este período.'
          : filter === 'expense' ? 'No tienes gastos registrados este período.'
          : 'Usa el botón + para registrar tu primer movimiento.'}
      </Text>
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
    letterSpacing: 0.8, marginTop: Spacing.md, marginBottom: Spacing.xs,
  },

  txnRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1, borderColor: Colors.border,
  },
  txnIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txnMeta: { flex: 1 },
  txnDesc: { color: Colors.textPrimary, fontSize: Typography.base, fontWeight: Typography.medium },
  txnSub: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  txnAmt: { fontSize: Typography.base, fontWeight: Typography.bold },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: Typography.bold, marginBottom: Spacing.xs },
  emptySub: { color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center', lineHeight: 22 },
});
