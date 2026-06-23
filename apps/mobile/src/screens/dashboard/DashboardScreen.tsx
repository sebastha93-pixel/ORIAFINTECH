import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchDashboard } from '../../store/slices/dashboardSlice';
import { Colors, Spacing, Typography, BorderRadius, NumberTextStyles } from '../../theme';
import {
  formatCurrency,
} from '../../utils/format';
import { InsightCard } from '../../components/cards/InsightCard';
import { GoalProgressCard } from '../../components/cards/GoalProgressCard';
import { DonutChart } from '../../components/charts/DonutChart';
import { NetWorthLineChart } from '../../components/charts/NetWorthLineChart';
import { TransactionRow } from '../../components/common/TransactionRow';
import { AccountCard } from '../../components/cards/AccountCard';

type Nav = { navigate: (s: string) => void };

// ─── Counter animation hook ───────────────────────
function useCounterAnimation(targetValue: number, duration = 600) {
  const animVal = useRef(new Animated.Value(0)).current;

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

  const netWorthTarget = data?.net_worth ?? 0;
  const animatedNetWorth = useCounterAnimation(netWorthTarget);

  if (isLoading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="sparkles" size={32} color={Colors.accent} />
        <Text style={{ color: Colors.textSecondary, marginTop: 12, fontFamily: Typography.fontSans }}>Cargando...</Text>
      </View>
    );
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
      {/* ── HEADER — subtle dark-to-bg gradient ── */}
      <LinearGradient
        colors={['#0E1620', Colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          {/* ORIA Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoIconWrap}>
              <View style={styles.logoIconBg}>
                <Ionicons name="sparkles" size={18} color={Colors.accent} />
              </View>
            </View>
            <View>
              <Text style={styles.logoBrand}>ORIA</Text>
              <Text style={styles.logoSub}>FINANZAS</Text>
            </View>
          </View>

          {/* Bell */}
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
            {(data?.insights?.length ?? 0) > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>
          Hola, <Text style={styles.greetingName}>{name} 👋</Text>
        </Text>
        <Text style={styles.greetingSub}>Resumen de hoy</Text>

        {/* ── PATRIMONIO HERO CARD ── */}
        <View style={styles.heroCard}>
          {/* Label + eye */}
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Patrimonio neto</Text>
            <Ionicons name="eye-outline" size={18} color={Colors.textMuted} />
          </View>

          {/* Hero amount — DM Mono 300 */}
          <View style={styles.heroAmountRow}>
            <Text style={styles.heroCurrencySymbol}>$</Text>
            <Animated.Text style={styles.heroAmount}>
              {formatCurrency(netWorth, currency)}
            </Animated.Text>
          </View>

          {/* Change pill */}
          <View style={styles.heroChange}>
            <View style={[
              styles.changePill,
              { backgroundColor: netWorthPct >= 0 ? Colors.accentBg : Colors.dangerBg },
            ]}>
              <Ionicons
                name={netWorthPct >= 0 ? 'trending-up' : 'trending-down'}
                size={13}
                color={netWorthPct >= 0 ? Colors.accent : Colors.danger}
              />
              <Text style={[
                styles.changePillText,
                { color: netWorthPct >= 0 ? Colors.accent : Colors.danger },
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
        </View>
      </LinearGradient>

      {/* ── SUMMARY CHIPS ROW: Ingresos / Gastos / Ahorro ── */}
      <View style={styles.summaryRow}>
        <SummaryChip
          label="Ingresos"
          value={formatCurrency(monthIncome, currency, true)}
          color={Colors.accent}
          bg={Colors.accentBg}
          icon="arrow-down-circle"
        />
        <SummaryChip
          label="Gastos"
          value={formatCurrency(monthExpenses, currency, true)}
          color={Colors.danger}
          bg={Colors.dangerBg}
          icon="arrow-up-circle"
        />
        <SummaryChip
          label="Ahorro"
          value={formatCurrency(monthSavings, currency, true)}
          color={Colors.amber}
          bg={Colors.amberBg}
          icon="wallet"
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
            <DonutChart
              data={data!.spending_by_category}
              currency={currency}
            />
          </View>
        </Section>
      )}

      {/* ── IA INSIGHTS ── */}
      {(data?.insights?.length ?? 0) > 0 && (
        <Section
          title="ORIA IA"
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
      ) : null}

      {/* ── METAS ACTIVAS ── */}
      {(data?.active_goals?.length ?? 0) > 0 && (
        <Section
          title="Mis metas"
          actionLabel="Ver todas"
          onAction={() => navigation.navigate('Goals')}
          icon="flag"
          iconColor={Colors.amber}
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
          <InlineEmptyState onPress={() => navigation.navigate('Accounts')} />
        </View>
      )}

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function SummaryChip({
  label, value, color, bg, icon,
}: {
  label: string; value: string; color: string; bg: string; icon: string;
}) {
  return (
    <View style={[styles.summaryChip, { backgroundColor: Colors.surfaceElevated }]}>
      <View style={[styles.summaryChipIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon as 'wallet'} size={14} color={color} />
      </View>
      <Text style={[styles.summaryChipValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.summaryChipLabel}>{label}</Text>
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

function InlineEmptyState({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ alignItems: 'center', gap: Spacing.md, padding: Spacing.xl }}>
      <View style={{
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: Colors.accentBg,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name="wallet-outline" size={32} color={Colors.accent} />
      </View>
      <Text style={{ color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: Typography.bold, textAlign: 'center' }}>
        Comienza tu viaje financiero
      </Text>
      <Text style={{ color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center', lineHeight: 22 }}>
        Agrega tus cuentas y registra tus movimientos para ver aquí tu resumen financiero personalizado.
      </Text>
      <TouchableOpacity
        onPress={onPress}
        style={{
          backgroundColor: Colors.accent,
          borderRadius: 10, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
          flexDirection: 'row', alignItems: 'center', gap: 6,
        }}
      >
        <Ionicons name="add" size={18} color={Colors.background} />
        <Text style={{ color: Colors.background, fontSize: Typography.base, fontWeight: Typography.bold }}>
          Agregar primera cuenta
        </Text>
      </TouchableOpacity>
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

  // Header — paddingTop is dynamic via insets.top + 16
  header: { paddingBottom: Spacing.lg },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logoIconWrap: { borderRadius: BorderRadius.sm, overflow: 'hidden' },
  logoIconBg: {
    width: 36, height: 36, borderRadius: BorderRadius.sm,
    backgroundColor: Colors.accentBg,
    justifyContent: 'center', alignItems: 'center',
  },
  logoBrand: {
    color: Colors.textPrimary, fontSize: 15, fontWeight: Typography.extrabold,
    letterSpacing: 2, fontFamily: Typography.fontSansBold,
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

  // Hero card — flat, surface bg, 8px radius
  heroCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  heroLabel: { color: Colors.textSecondary, fontSize: Typography.sm },
  heroAmountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: Spacing.sm },
  heroCurrencySymbol: {
    ...NumberTextStyles.hero,
    color: Colors.textMuted, fontSize: Typography.xl,
    paddingBottom: 4,
  },
  heroAmount: {
    ...NumberTextStyles.hero,
    color: Colors.textPrimary, fontSize: Typography.display,
  },
  heroChange: { marginBottom: Spacing.sm },
  changePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  changePillText: { ...NumberTextStyles.percentageSm, fontSize: Typography.xs },
  sparklineWrap: { marginTop: Spacing.sm },

  // Summary chips row
  summaryRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, marginTop: Spacing.lg,
  },
  summaryChip: {
    flex: 1, borderRadius: 8, padding: Spacing.sm,
    alignItems: 'flex-start', gap: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  summaryChipIcon: {
    width: 26, height: 26, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  summaryChipValue: {
    ...NumberTextStyles.amountSm,
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },
  summaryChipLabel: { color: Colors.textMuted, fontSize: 10 },

  // Section
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: {
    color: Colors.textPrimary, fontSize: Typography.md,
    fontWeight: Typography.bold, fontFamily: Typography.fontSansBold,
  },
  sectionAction: { color: Colors.accent, fontSize: Typography.sm, fontWeight: Typography.medium },

  // Donut card — flat surface, no gradient
  donutCard: {
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, overflow: 'hidden',
    padding: Spacing.lg,
  },

  // Accounts horizontal scroll
  accountsRow: { gap: Spacing.sm, paddingRight: Spacing.sm },
  addAccountCard: {
    width: 110, borderRadius: 8,
    borderWidth: 1.5, borderColor: Colors.accent + '40',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
    padding: Spacing.md,
  },
  addAccountInner: { alignItems: 'center', gap: Spacing.xs },
  addAccountIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.accentBg, justifyContent: 'center', alignItems: 'center',
  },
  addAccountText: { color: Colors.textMuted, fontSize: Typography.xs, textAlign: 'center', lineHeight: 16 },

  // Transactions card
  txCard: {
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  txDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },

  // Full empty wrap (when no data at all)
  fullEmptyWrap: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
});
