import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchDashboard } from '../../store/slices/dashboardSlice';
import { Colors, Spacing, Typography, BorderRadius, Shadows, NumberTextStyles } from '../../theme';
import {
  formatCurrency,
  formatPercentage,
  getChangeColor,
  getChangeIcon,
} from '../../utils/format';
import { InsightCard } from '../../components/cards/InsightCard';
import { GoalProgressCard } from '../../components/cards/GoalProgressCard';
import { DonutChart } from '../../components/charts/DonutChart';
import { NetWorthLineChart } from '../../components/charts/NetWorthLineChart';
import { TransactionRow } from '../../components/common/TransactionRow';
import { AccountCard } from '../../components/cards/AccountCard';
import { SkeletonDashboard } from '../../components/skeleton';
import { EmptyState } from '../../components/common/EmptyState';

type Nav = { navigate: (s: string) => void };

// ─── Counter animation hook ───────────────────────
function useCounterAnimation(targetValue: number, duration = 600) {
  const animVal = useRef(new Animated.Value(0)).current;
  const displayVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!targetValue) return;
    Animated.timing(animVal, {
      toValue: targetValue,
      duration,
      useNativeDriver: false,
    }).start();
  }, [targetValue]);

  return animVal;
}

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export function DashboardScreen({ navigation }: { navigation: Nav }) {
  const dispatch = useAppDispatch();
  const { data, isLoading } = useAppSelector((s) => s.dashboard);
  const profile = useAppSelector((s) => s.auth.profile);
  const insets = useSafeAreaInsets();

  const load = useCallback(() => { dispatch(fetchDashboard()); }, [dispatch]);
  useEffect(() => { load(); }, [load]);

  const currency = profile?.currency_code || 'COP';
  const name = profile?.full_name?.split(' ')[0] || 'Sebastián';

  // Counter animation for net worth
  const netWorthTarget = data?.net_worth ?? 0;
  const animatedNetWorth = useCounterAnimation(netWorthTarget);

  if (isLoading && !data) {
    return <SkeletonDashboard />;
  }

  const netWorth      = data?.net_worth ?? 0;
  const netWorthPct   = data?.net_worth_change_percentage ?? 0;
  const monthIncome   = data?.monthly_income ?? 0;
  const monthExpenses = data?.monthly_expenses ?? 0;
  const monthSavings  = data?.monthly_savings ?? 0;
  const savingsRate   = (data?.savings_rate ?? 0) * 100;
  const vsPrevMonth   = data as any;
  const incomePct     = vsPrevMonth?.vs_previous_month?.income_change_pct ?? 0;
  const expensePct    = vsPrevMonth?.vs_previous_month?.expense_change_pct ?? 0;
  const savingsPct    = savingsRate;

  return (
    <ScrollView
      style={styles.root}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={load}
          tintColor={Colors.accent}
          colors={[Colors.accent]}
        />
      }
    >
      {/* ── HEADER ── */}
      <LinearGradient
        colors={['#0D1B3E', Colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoIconWrap}>
              <LinearGradient
                colors={[Colors.primaryGlow, Colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Text style={styles.logoLetter}>N</Text>
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.logoBrand}>NEXO</Text>
              <Text style={styles.logoSub}>FINANZAS</Text>
            </View>
          </View>

          {/* Bell */}
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
            {(data?.insights?.length ?? 0) > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>
          Hola, <Text style={styles.greetingName}>{name} 👋</Text>
        </Text>
        <Text style={styles.greetingSub}>Resumen de hoy</Text>

        {/* ── PATRIMONIO HERO CARD ── */}
        <View style={[styles.heroCard, Shadows.glowBlue]}>
          <LinearGradient
            colors={['#162033', '#0F1A2E']}
            style={styles.heroGradient}
          >
            {/* Label + eye */}
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>Patrimonio neto</Text>
              <Ionicons name="eye-outline" size={18} color={Colors.textMuted} />
            </View>

            {/* Animated counter amount */}
            <Animated.Text style={styles.heroAmount}>
              {formatCurrency(netWorth, currency)}
            </Animated.Text>

            {/* Change */}
            <View style={styles.heroChange}>
              <View style={[
                styles.changePill,
                { backgroundColor: netWorthPct >= 0 ? Colors.successBg : Colors.dangerBg },
              ]}>
                <Ionicons
                  name={netWorthPct >= 0 ? 'trending-up' : 'trending-down'}
                  size={13}
                  color={netWorthPct >= 0 ? Colors.success : Colors.danger}
                />
                <Text style={[
                  styles.changePillText,
                  { color: netWorthPct >= 0 ? Colors.success : Colors.danger },
                ]}>
                  {netWorthPct >= 0 ? '+' : ''}{netWorthPct.toFixed(1)}% vs mes anterior
                </Text>
              </View>
            </View>

            {/* Mini sparkline */}
            {(data?.net_worth_history?.length ?? 0) > 1 && (
              <View style={styles.sparklineWrap}>
                <NetWorthLineChart
                  history={data!.net_worth_history}
                  height={56}
                  color={netWorthPct >= 0 ? Colors.accent : Colors.danger}
                  compact
                />
              </View>
            )}
          </LinearGradient>
        </View>
      </LinearGradient>

      {/* ── STATS ROW ── */}
      <View style={styles.statsRow}>
        <StatCard
          label="Ingresos"
          value={formatCurrency(monthIncome, currency, true)}
          pct={incomePct}
          icon="arrow-down-circle"
          color={Colors.success}
          bg={Colors.successBg}
        />
        <StatCard
          label="Gastos"
          value={formatCurrency(monthExpenses, currency, true)}
          pct={expensePct}
          icon="arrow-up-circle"
          color={Colors.danger}
          bg={Colors.dangerBg}
          invertPct
        />
        <StatCard
          label="Ahorro del mes"
          value={formatCurrency(monthSavings, currency, true)}
          pct={savingsPct}
          icon="wallet"
          color={Colors.primaryGlow}
          bg={Colors.infoBg}
          suffix="%"
        />
      </View>

      {/* ── GASTOS POR CATEGORÍA ── */}
      {(data?.spending_by_category?.length ?? 0) > 0 && (
        <Section
          title="Gastos por categoría"
          actionLabel="Ver todas"
          onAction={() => navigation.navigate('Transactions')}
        >
          <View style={styles.donutCard}>
            <LinearGradient colors={Colors.gradientCard} style={styles.donutGradient}>
              <DonutChart
                data={data!.spending_by_category}
                currency={currency}
              />
            </LinearGradient>
          </View>
        </Section>
      )}

      {/* ── IA INSIGHTS ── */}
      {(data?.insights?.length ?? 0) > 0 && (
        <Section
          title="Nexo IA"
          actionLabel="Ver todo"
          onAction={() => navigation.navigate('AI')}
          icon="sparkles"
          iconColor={Colors.accent}
        >
          {data!.insights.slice(0, 2).map(ins => (
            <InsightCard key={ins.id} insight={ins} />
          ))}
        </Section>
      )}

      {/* ── CUENTAS ── */}
      {(data?.accounts?.length ?? 0) > 0 ? (
        <Section
          title="Mis cuentas"
          actionLabel="Ver todas"
          onAction={() => navigation.navigate('Accounts')}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountsRow}
          >
            {data!.accounts.map(acc => (
              <AccountCard key={acc.id} account={acc} currency={currency} />
            ))}
            <AddAccountCard onPress={() => navigation.navigate('AddAccount')} />
          </ScrollView>
        </Section>
      ) : (
        !isLoading && !data && (
          <Section title="Mis cuentas">
            <EmptyState
              icon={<Ionicons name="wallet-outline" size={28} color={Colors.accent} />}
              title="Sin cuentas conectadas"
              subtitle="Agrega tu primera cuenta para ver tu balance aquí."
              ctaLabel="Agregar cuenta"
              onCta={() => navigation.navigate('AddAccount')}
            />
          </Section>
        )
      )}

      {/* ── METAS ACTIVAS ── */}
      {(data?.active_goals?.length ?? 0) > 0 && (
        <Section
          title="Mis metas"
          actionLabel="Ver todas"
          onAction={() => navigation.navigate('Goals')}
          icon="flag"
          iconColor={Colors.warning}
        >
          {data!.active_goals.slice(0, 2).map(goal => (
            <GoalProgressCard key={goal.id} goal={goal} currency={currency} />
          ))}
        </Section>
      )}

      {/* ── ÚLTIMOS MOVIMIENTOS ── */}
      {(data?.recent_transactions?.length ?? 0) > 0 && (
        <Section
          title="Últimos movimientos"
          actionLabel="Ver todos"
          onAction={() => navigation.navigate('Transactions')}
        >
          <View style={styles.txCard}>
            {data!.recent_transactions.map((tx, i) => (
              <View key={tx.id}>
                <TransactionRow transaction={tx} currency={currency} />
                {i < data!.recent_transactions.length - 1 && (
                  <View style={styles.txDivider} />
                )}
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* ── EMPTY STATE — no data at all ── */}
      {!isLoading && !data && (
        <View style={styles.fullEmptyWrap}>
          <EmptyState
            icon={<Ionicons name="wallet-outline" size={28} color={Colors.accent} />}
            title="Comienza tu viaje financiero"
            subtitle="Agrega tus cuentas y registra tus movimientos para ver aquí tu resumen financiero personalizado."
            ctaLabel="Agregar primera cuenta"
            onCta={() => navigation.navigate('Accounts')}
          />
        </View>
      )}

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function StatCard({
  label, value, pct, icon, color, bg, invertPct = false, suffix = '%',
}: {
  label: string; value: string; pct: number;
  icon: string; color: string; bg: string;
  invertPct?: boolean; suffix?: string;
}) {
  const good = invertPct ? pct <= 0 : pct >= 0;
  const displayPct = Math.abs(pct);
  const sign = pct >= 0 ? '+' : '-';

  return (
    <View style={styles.statCard}>
      <LinearGradient colors={Colors.gradientCard} style={styles.statGradient}>
        <View style={[styles.statIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon as 'wallet'} size={16} color={color} />
        </View>
        <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statPctRow}>
          <Ionicons
            name={good ? 'trending-up' : 'trending-down'}
            size={11}
            color={good ? Colors.success : Colors.danger}
          />
          <Text style={[styles.statPct, { color: good ? Colors.success : Colors.danger }]}>
            {sign}{displayPct.toFixed(1)}{suffix}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function Section({
  title, actionLabel, onAction, icon, iconColor, children,
}: {
  title: string; actionLabel?: string; onAction?: () => void;
  icon?: string; iconColor?: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          {icon && (
            <Ionicons name={icon as 'sparkles'} size={16} color={iconColor || Colors.textSecondary} style={{ marginRight: 6 }} />
          )}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {actionLabel && onAction && (
          <TouchableOpacity onPress={onAction}>
            <Text style={styles.sectionAction}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function AddAccountCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.addAccountCard} onPress={onPress}>
      <View style={styles.addAccountInner}>
        <View style={styles.addAccountIcon}>
          <Ionicons name="add" size={22} color={Colors.accent} />
        </View>
        <Text style={styles.addAccountText}>Agregar{'\n'}cuenta</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header — paddingTop is now dynamic via insets.top + 16
  header: { paddingBottom: Spacing.lg },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logoIconWrap: { borderRadius: BorderRadius.sm, overflow: 'hidden' },
  logoGradient: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  logoLetter: {
    color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold,
    fontFamily: 'System',
  },
  logoBrand: {
    color: Colors.textPrimary, fontSize: 15, fontWeight: Typography.extrabold,
    letterSpacing: 2,
  },
  logoSub: {
    color: Colors.textMuted, fontSize: 8, fontWeight: Typography.medium,
    letterSpacing: 3, marginTop: -2,
  },
  bellBtn: { position: 'relative', padding: Spacing.xs },
  bellDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger,
    borderWidth: 1.5, borderColor: Colors.background,
  },

  greeting: {
    color: Colors.textSecondary, fontSize: Typography.md,
    paddingHorizontal: Spacing.lg, marginBottom: 2,
  },
  greetingName: { color: Colors.textPrimary, fontWeight: Typography.bold },
  greetingSub: {
    color: Colors.textMuted, fontSize: Typography.sm,
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg,
  },

  // Hero card
  heroCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  heroGradient: { padding: Spacing.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  heroLabel: { color: Colors.textSecondary, fontSize: Typography.sm },
  heroAmount: {
    ...NumberTextStyles.hero,
    color: Colors.textPrimary, fontSize: Typography.display,
    marginBottom: Spacing.sm,
  },
  heroChange: { marginBottom: Spacing.sm },
  changePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  changePillText: { ...NumberTextStyles.percentageSm, fontSize: Typography.xs },
  sparklineWrap: { marginTop: Spacing.sm },

  // Stats row
  statsRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, marginTop: Spacing.lg,
  },
  statCard: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  statGradient: { padding: Spacing.sm, gap: 4 },
  statIcon: { width: 28, height: 28, borderRadius: BorderRadius.xs, justifyContent: 'center', alignItems: 'center' },
  statValue: { ...NumberTextStyles.kpi, color: Colors.textPrimary, fontSize: Typography.sm, marginTop: 2 },
  statLabel: { color: Colors.textMuted, fontSize: 10 },
  statPctRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  statPct: { ...NumberTextStyles.percentageSm, fontSize: 10 },

  // Section
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: Typography.bold },
  sectionAction: { color: Colors.accent, fontSize: Typography.sm, fontWeight: Typography.medium },

  // Donut card
  donutCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  donutGradient: { padding: Spacing.lg },

  // Accounts horizontal scroll
  accountsRow: { gap: Spacing.sm, paddingRight: Spacing.sm },
  addAccountCard: {
    width: 110, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.accent + '40',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
    padding: Spacing.md,
  },
  addAccountInner: { alignItems: 'center', gap: Spacing.xs },
  addAccountIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.accent + '15', justifyContent: 'center', alignItems: 'center',
  },
  addAccountText: { color: Colors.textMuted, fontSize: Typography.xs, textAlign: 'center', lineHeight: 16 },

  // Transactions card
  txCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  txDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },

  // Full empty wrap (when no data at all)
  fullEmptyWrap: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
});
