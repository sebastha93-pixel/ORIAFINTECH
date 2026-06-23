import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, RefreshControl,
  Platform, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { api } from '../../services/api';
import { Goal, GoalType } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';

// ─── helpers ───────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const clamp = (v: number) => Math.min(100, Math.max(0, v));

const GOAL_ICONS: Record<GoalType, string> = {
  savings: 'save', debt_payoff: 'trending-down', investment: 'trending-up',
  emergency_fund: 'shield-checkmark', purchase: 'bag', retirement: 'sunny',
  travel: 'airplane', education: 'school', other: 'flag',
};

const GOAL_LABELS: Record<GoalType, string> = {
  savings: 'Ahorro', debt_payoff: 'Pagar deuda', investment: 'Inversión',
  emergency_fund: 'Fondo emergencia', purchase: 'Compra', retirement: 'Retiro',
  travel: 'Viaje', education: 'Educación', other: 'Otro',
};

// ─── Component ─────────────────────────────────────────────
export function GoalsScreen() {
  const [goals, setGoals]           = useState<Goal[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [addGoal, setAddGoal]       = useState<string | null>(null); // goalId for contribution

  const load = useCallback(async (refresh = false) => {
    try {
      const data = await api.getGoals();
      setGoals(data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(true); };

  const totalTarget  = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved   = goals.reduce((s, g) => s + g.current_amount, 0);
  const activeGoals  = goals.filter((g) => g.status === 'active').length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;

  const overallPct = totalTarget > 0 ? clamp((totalSaved / totalTarget) * 100) : 0;

  const renderGoal = ({ item }: { item: Goal }) => {
    const pct = item.progress_percentage ?? clamp((item.current_amount / item.target_amount) * 100);
    const remaining = item.target_amount - item.current_amount;
    const icon = GOAL_ICONS[item.goal_type] || 'flag';
    const color = item.color || Colors.accent;
    const isComplete = item.status === 'completed';

    return (
      <View style={s.goalCard}>
        {/* Icon + title row */}
        <View style={s.goalHeader}>
          <View style={[s.goalIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon as 'home'} size={22} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.goalName} numberOfLines={1}>{item.name}</Text>
            <Text style={s.goalType}>{GOAL_LABELS[item.goal_type]}</Text>
          </View>
          {isComplete ? (
            <View style={s.completeBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.accent} />
              <Text style={s.completeBadgeText}>Lograda</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={s.addBtn}
              onPress={() => setAddGoal(item.id)}
            >
              <Ionicons name="add" size={18} color={Colors.accent} />
            </TouchableOpacity>
          )}
        </View>

        {/* Progress bar */}
        <View style={s.progressWrap}>
          <View style={[s.progressTrack, { backgroundColor: Colors.border }]}>
            <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
          </View>
          <Text style={[s.pctLabel, { color }]}>{Math.round(pct)}%</Text>
        </View>

        {/* Amounts row */}
        <View style={s.amtRow}>
          <View>
            <Text style={s.amtLabel}>Ahorrado</Text>
            <Text style={[s.amtValue, { color }]}>{fmt(item.current_amount)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.amtLabel}>Meta</Text>
            <Text style={s.amtValueMuted}>{fmt(item.target_amount)}</Text>
          </View>
        </View>

        {/* Footer: monthly contribution + target date */}
        {!isComplete && (
          <View style={s.goalFooter}>
            {item.monthly_contribution ? (
              <View style={s.footerChip}>
                <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                <Text style={s.footerChipText}>{fmt(item.monthly_contribution)}/mes</Text>
              </View>
            ) : null}
            {item.target_date ? (
              <View style={s.footerChip}>
                <Ionicons name="flag-outline" size={12} color={Colors.textMuted} />
                <Text style={s.footerChipText}>
                  {new Date(item.target_date).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                </Text>
              </View>
            ) : null}
            {remaining > 0 && (
              <Text style={s.remainText}>Faltan {fmt(remaining)}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <LinearGradient colors={['#0D1B3E', Colors.background]} style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Mis Metas</Text>
          <TouchableOpacity style={s.newGoalBtn} onPress={() => setShowAdd(true)}>
            <LinearGradient colors={Colors.gradientAccent} style={s.newGoalGrad}>
              <Ionicons name="add" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Summary card */}
        <View style={s.summaryCard}>
          <View style={s.summaryLeft}>
            <Text style={s.summaryLabel}>Progreso total</Text>
            <Text style={s.summaryValue}>{fmt(totalSaved)}</Text>
            <Text style={s.summaryMeta}>de {fmt(totalTarget)} en {goals.length} meta{goals.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={s.summaryRight}>
            <View style={s.summaryStatRow}>
              <View style={[s.statDot, { backgroundColor: Colors.accent }]} />
              <Text style={s.statLabel}>{activeGoals} activa{activeGoals !== 1 ? 's' : ''}</Text>
            </View>
            <View style={s.summaryStatRow}>
              <View style={[s.statDot, { backgroundColor: Colors.primaryGlow }]} />
              <Text style={s.statLabel}>{completedGoals} lograda{completedGoals !== 1 ? 's' : ''}</Text>
            </View>
            <Text style={s.overallPct}>{Math.round(overallPct)}%</Text>
          </View>
        </View>

        {/* Overall progress bar */}
        <View style={s.overallTrack}>
          <LinearGradient
            colors={Colors.gradientAccent}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.overallFill, { width: `${overallPct}%` as any }]}
          />
        </View>
      </LinearGradient>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="flag-outline" size={28} color={Colors.accent} />}
          title="Sin metas aún"
          subtitle="Define una meta financiera y conecta tus ahorros automáticamente."
          ctaLabel="Crear primera meta"
          onCta={() => setShowAdd(true)}
        />
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(g) => g.id}
          renderItem={renderGoal}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        />
      )}

      {/* Add contribution modal */}
      {addGoal && (
        <ContributionModal
          goalId={addGoal}
          goalName={goals.find((g) => g.id === addGoal)?.name || ''}
          onClose={() => setAddGoal(null)}
          onSaved={() => { setAddGoal(null); load(true); }}
        />
      )}

      {/* New goal modal */}
      {showAdd && (
        <NewGoalModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(true); }}
        />
      )}
    </View>
  );
}

// EmptyGoals replaced by shared EmptyState component

// ─── Contribution modal ────────────────────────────────────
function ContributionModal({ goalId, goalName, onClose, onSaved }: {
  goalId: string; goalName: string; onClose: () => void; onSaved: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const num = parseFloat(amount.replace(',', '.'));
    if (!num || num <= 0) { Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0'); return; }
    setSaving(true);
    try {
      await api.addGoalContribution(goalId, num, note || undefined);
      onSaved();
    } catch {
      Alert.alert('Error', 'No se pudo registrar el aporte.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide">
      <KeyboardAvoidingView style={cm.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={cm.sheet}>
          <View style={cm.handle} />
          <Text style={cm.title}>Agregar aporte</Text>
          <Text style={cm.sub}>{goalName}</Text>

          <View style={cm.field}>
            <Text style={cm.fieldLabel}>$ Monto</Text>
            <TextInput
              style={cm.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
          </View>

          <View style={cm.field}>
            <Text style={cm.fieldLabel}>Nota (opcional)</Text>
            <TextInput
              style={cm.input}
              value={note}
              onChangeText={setNote}
              placeholder="Ej: quincena de mayo"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <TouchableOpacity style={cm.saveWrap} onPress={save} disabled={saving}>
            <LinearGradient colors={Colors.gradientAccent} style={cm.saveBtn}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={cm.saveBtnText}>Confirmar aporte</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={cm.cancelBtn} onPress={onClose}>
            <Text style={cm.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── New goal modal ────────────────────────────────────────
const GOAL_TYPES: GoalType[] = [
  'savings', 'emergency_fund', 'travel', 'purchase', 'debt_payoff', 'investment', 'education', 'other',
];

function NewGoalModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName]         = useState('');
  const [goalType, setGoalType] = useState<GoalType>('savings');
  const [target, setTarget]     = useState('');
  const [monthly, setMonthly]   = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving]     = useState(false);

  const save = async () => {
    if (!name.trim()) { Alert.alert('Nombre requerido'); return; }
    const targetNum = parseFloat(target.replace(',', '.'));
    if (!targetNum || targetNum <= 0) { Alert.alert('Meta inválida', 'Ingresa el monto objetivo'); return; }
    setSaving(true);
    try {
      await api.createGoal({
        name: name.trim(),
        goal_type: goalType,
        target_amount: targetNum,
        current_amount: 0,
        monthly_contribution: monthly ? parseFloat(monthly.replace(',', '.')) : undefined,
        target_date: targetDate || undefined,
        status: 'active',
      });
      onSaved();
    } catch {
      Alert.alert('Error', 'No se pudo crear la meta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide">
      <KeyboardAvoidingView style={cm.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[cm.sheet, { maxHeight: '85%' }]}>
          <View style={cm.handle} />
          <Text style={cm.title}>Nueva meta financiera</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Goal type selector */}
            <Text style={ng.sectionLabel}>Tipo de meta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ng.typeScroll}>
              {GOAL_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[ng.typeChip, goalType === t && ng.typeChipActive]}
                  onPress={() => setGoalType(t)}
                >
                  <Ionicons
                    name={(GOAL_ICONS[t] || 'flag') as 'home'}
                    size={14}
                    color={goalType === t ? '#fff' : Colors.textMuted}
                  />
                  <Text style={[ng.typeChipText, goalType === t && ng.typeChipTextActive]}>
                    {GOAL_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={ng.field}>
              <Text style={cm.fieldLabel}>Nombre de la meta</Text>
              <TextInput
                style={ng.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Fondo de emergencia"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={ng.field}>
              <Text style={cm.fieldLabel}>Monto objetivo ($)</Text>
              <TextInput
                style={ng.input}
                value={target}
                onChangeText={setTarget}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={ng.field}>
              <Text style={cm.fieldLabel}>Aporte mensual (opcional)</Text>
              <TextInput
                style={ng.input}
                value={monthly}
                onChangeText={setMonthly}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={ng.field}>
              <Text style={cm.fieldLabel}>Fecha objetivo (YYYY-MM-DD)</Text>
              <TextInput
                style={ng.input}
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="2026-12-31"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </ScrollView>

          <TouchableOpacity style={cm.saveWrap} onPress={save} disabled={saving}>
            <LinearGradient colors={Colors.gradientAccent} style={cm.saveBtn}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={cm.saveBtnText}>Crear meta</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={cm.cancelBtn} onPress={onClose}>
            <Text style={cm.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: Typography.bold },
  newGoalBtn: { borderRadius: BorderRadius.full, overflow: 'hidden' },
  newGoalGrad: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },

  summaryCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginBottom: Spacing.sm,
  },
  summaryLeft: {},
  summaryLabel: { color: Colors.textMuted, fontSize: Typography.xs, marginBottom: 2 },
  summaryValue: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: Typography.extrabold },
  summaryMeta: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  summaryRight: { alignItems: 'flex-end', gap: 4 },
  summaryStatRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statDot: { width: 7, height: 7, borderRadius: 4 },
  statLabel: { color: Colors.textSecondary, fontSize: Typography.xs },
  overallPct: { color: Colors.accent, fontSize: Typography.lg, fontWeight: Typography.extrabold },

  overallTrack: {
    height: 4, backgroundColor: Colors.border,
    borderRadius: 2, overflow: 'hidden',
  },
  overallFill: { height: 4, borderRadius: 2 },

  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 120 },

  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
    gap: Spacing.sm,
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  goalIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  goalName: { color: Colors.textPrimary, fontSize: Typography.base, fontWeight: Typography.semibold },
  goalType: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 1 },
  completeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.successBg, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  completeBadgeText: { color: Colors.accent, fontSize: Typography.xs },
  addBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.accent + '20',
    justifyContent: 'center', alignItems: 'center',
  },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  pctLabel: { fontSize: Typography.xs, fontWeight: Typography.bold, width: 34, textAlign: 'right' },

  amtRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amtLabel: { color: Colors.textMuted, fontSize: Typography.xs, marginBottom: 1 },
  amtValue: { fontSize: Typography.sm, fontWeight: Typography.bold },
  amtValueMuted: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: Typography.semibold },

  goalFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  footerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  footerChipText: { color: Colors.textMuted, fontSize: Typography.xs },
  remainText: { color: Colors.textMuted, fontSize: Typography.xs, marginLeft: 'auto' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: Typography.bold, marginBottom: Spacing.xs },
  emptySub: { color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  emptyBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  emptyBtnGrad: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  emptyBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
});

const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 44 : Spacing.lg,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  title: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: Typography.bold, marginBottom: 4 },
  sub: { color: Colors.textMuted, fontSize: Typography.sm, marginBottom: Spacing.lg },
  field: { marginBottom: Spacing.md },
  fieldLabel: { color: Colors.textSecondary, fontSize: Typography.sm, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, height: 50,
    color: Colors.textPrimary, fontSize: Typography.base,
  },
  saveWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.md },
  saveBtn: { height: 52, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
  cancelBtn: {
    marginTop: Spacing.sm, paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  cancelText: { color: Colors.textMuted, fontSize: Typography.base },
});

const ng = StyleSheet.create({
  sectionLabel: { color: Colors.textSecondary, fontSize: Typography.sm, marginBottom: Spacing.sm },
  typeScroll: { marginBottom: Spacing.lg },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  typeChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  typeChipText: { color: Colors.textMuted, fontSize: Typography.xs },
  typeChipTextActive: { color: '#fff', fontWeight: Typography.semibold },
  field: { marginBottom: Spacing.md },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, height: 50,
    color: Colors.textPrimary, fontSize: Typography.base,
  },
});
