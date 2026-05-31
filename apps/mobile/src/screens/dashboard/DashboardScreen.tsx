import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchDashboard } from '../../store/slices/dashboardSlice';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { formatCurrency, formatPercentage, getChangeColor } from '../../utils/format';
import { NetWorthCard } from '../../components/cards/NetWorthCard';
import { InsightCard } from '../../components/cards/InsightCard';
import { GoalProgressCard } from '../../components/cards/GoalProgressCard';
import { SpendingChart } from '../../components/charts/SpendingChart';
import { RecentTransactionItem } from '../../components/common/RecentTransactionItem';

export function DashboardScreen({ navigation }: { navigation: { navigate: (screen: string) => void } }) {
  const dispatch = useAppDispatch();
  const { data, isLoading } = useAppSelector((s) => s.dashboard);
  const profile = useAppSelector((s) => s.auth.profile);

  const load = useCallback(() => { dispatch(fetchDashboard()); }, [dispatch]);

  useEffect(() => { load(); }, [load]);

  if (isLoading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando tu resumen financiero...</Text>
      </View>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <LinearGradient colors={['#1A1A2E', '#0A0A0F']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{profile?.full_name?.split(' ')[0] || 'Usuario'}</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
            {(data?.insights?.length ?? 0) > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>

        {/* Net Worth Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Tu patrimonio neto</Text>
          <Text style={styles.heroAmount}>
            {formatCurrency(data?.net_worth || 0, profile?.currency_code || 'COP')}
          </Text>
          <View style={styles.heroChange}>
            <Ionicons
              name={((data?.net_worth_change || 0) >= 0 ? 'trending-up' : 'trending-down') as 'trending-up' | 'trending-down'}
              size={16}
              color={getChangeColor(data?.net_worth_change || 0)}
            />
            <Text style={[styles.heroChangePct, { color: getChangeColor(data?.net_worth_change || 0) }]}>
              {formatPercentage(data?.net_worth_change_percentage || 0)} este mes
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Monthly Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          label="Ingresos"
          value={formatCurrency(data?.monthly_income || 0, profile?.currency_code, true)}
          icon="arrow-down-circle"
          color={Colors.success}
        />
        <StatCard
          label="Gastos"
          value={formatCurrency(data?.monthly_expenses || 0, profile?.currency_code, true)}
          icon="arrow-up-circle"
          color={Colors.danger}
        />
        <StatCard
          label="Ahorro"
          value={`${((data?.savings_rate || 0) * 100).toFixed(0)}%`}
          icon="wallet"
          color={Colors.primary}
        />
      </View>

      {/* AI Insights */}
      {(data?.insights?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Insights de Nexo IA" onSeeAll={() => navigation.navigate('AI')} />
          {data?.insights?.slice(0, 2).map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </View>
      )}

      {/* Spending Chart */}
      {(data?.spending_by_category?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Gastos por categoría" onSeeAll={() => navigation.navigate('Transactions')} />
          <SpendingChart
            data={data?.spending_by_category || []}
            currency={profile?.currency_code || 'COP'}
          />
        </View>
      )}

      {/* Active Goals */}
      {(data?.active_goals?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Metas activas" onSeeAll={() => navigation.navigate('Goals')} />
          {data?.active_goals?.map(goal => (
            <GoalProgressCard key={goal.id} goal={goal} currency={profile?.currency_code || 'COP'} />
          ))}
        </View>
      )}

      {/* Net Worth Card */}
      {(data?.net_worth_history?.length ?? 0) > 1 && (
        <View style={styles.section}>
          <SectionHeader title="Evolución patrimonial" onSeeAll={() => navigation.navigate('Patrimony')} />
          <NetWorthCard
            history={data?.net_worth_history || []}
            currency={profile?.currency_code || 'COP'}
          />
        </View>
      )}

      {/* Recent Transactions */}
      {(data?.recent_transactions?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Últimos movimientos" onSeeAll={() => navigation.navigate('Transactions')} />
          {data?.recent_transactions?.map(t => (
            <RecentTransactionItem key={t.id} transaction={t} currency={profile?.currency_code || 'COP'} />
          ))}
        </View>
      )}

      {/* Empty State */}
      {!isLoading && !data?.recent_transactions?.length && (
        <View style={styles.emptyState}>
          <Ionicons name="wallet-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Comienza tu viaje financiero</Text>
          <Text style={styles.emptySubtitle}>Agrega tus cuentas y comienza a registrar tus movimientos para ver tu resumen aquí.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Accounts')}>
            <Text style={styles.emptyBtnText}>Agregar cuenta</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as 'wallet'} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={styles.seeAll}>Ver todo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: Typography.base },

  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  greeting: { color: Colors.textSecondary, fontSize: Typography.sm },
  userName: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: Typography.bold },
  notifBtn: { position: 'relative', padding: Spacing.xs },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger },

  heroCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroLabel: { color: Colors.textSecondary, fontSize: Typography.sm, marginBottom: Spacing.xs },
  heroAmount: { color: Colors.textPrimary, fontSize: Typography.display, fontWeight: Typography.bold, letterSpacing: -1 },
  heroChange: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, gap: Spacing.xs },
  heroChangePct: { fontSize: Typography.sm, fontWeight: Typography.medium },

  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: Typography.bold },
  statLabel: { color: Colors.textSecondary, fontSize: Typography.xs },

  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: Typography.semibold },
  seeAll: { color: Colors.primary, fontSize: Typography.sm },

  emptyState: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.md },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: Typography.semibold, textAlign: 'center' },
  emptySubtitle: { color: Colors.textSecondary, fontSize: Typography.base, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  emptyBtnText: { color: Colors.textPrimary, fontSize: Typography.base, fontWeight: Typography.semibold },
});
