import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, RefreshControl,
  Platform, ScrollView, KeyboardAvoidingView, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, NumberTextStyles } from '../../theme';
import { api } from '../../services/api';
import { Goal, GoalType } from '../../types';

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
  const [addGoal, setAddGoal]       = useState<string | null>(null);

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

  const totalTarget    = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved     = goals.reduce((s, g) => s + g.current_amount, 0);
  const activeGoals    = goals.filter((g) => g.status === 'active').length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;
  const overallPct     = totalTarget > 0 ? clamp((totalSaved / totalTarget) * 100) : 0;

  const renderGoal = ({ item }: { item: Goal }) => {
    const pct = item.progress_percentage ?? clamp((item.current_amount / item.target_amount) * 100);
    const remaining = item.target_amount - item.current_amount;
    const icon = GOAL_ICONS[item.goal_type] || 'flag';
    // Goal icon color: use item.color or cycle accent/amber
    const color = item.color || Colors.accent;
    const isComplete = item.status === 'completed';

    // Progress bar color: completed → accent, otherwise use color
    const barColor = isComplete ? Colors.accent : color;

    return (
      <View style={s.goalCard}>
        {/* Icon + title row */}
        <View style={s.goalHeader}>
          {/* Goal icon in color+20 opacity bg */}
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
            <Pressable
              style={({ pressed }) => [
                s.addBtn,
                pressed && { opacity: 0.72, transform: [{ scale: 0.97 }] },
              ]}
              onPress={() => setAddGoal(item.id)}
            >
              <Ionicons name="add" size={18} color={Colors.accent} />
            </Pressable>
          )}
        </View>

        {/* Progress bar — accent or goal color */}
        <View style={s.progressWrap}>
          <View style={[s.progressTrack, { backgroundColor: Colors.border }]}>
            <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
          </View>
          {/* Percentage in DM Sans 600 amber or accent */}
          <Text style={[s.pctLabel, { color: color === Colors.accent ? Colors.accent : Colors.amber }]}>
            {Math.round(pct)}%
          </Text>
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
      {/* ── HEADER — flat bg, no gradient ── */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Mis Metas</Text>
          {/* New goal button — accent bg */}
          <Pressable
            style={({ pressed }) => [
              s.newGoalBtn,
              pressed && { opacity: 0.72, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => setShowAdd(true)}
          >
            <Ionicons name="add" size={20} color={Colors.background} />
          </Pressable>
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
              <View style={[s.statDot, { backgroundColor: Colors.amber }]} />
              <Text style={s.statLabel}>{completedGoals} lograda{completedGoals !== 1 ? 's' : ''}</Text>
            </View>
            <Text style={s.overallPct}>{Math.round(overallPct)}%</Text>
          </View>
        </View>

        {/* Overall progress bar — accent color */}
        <View style={s.overallTrack}>
          <View style={[s.overallFill, { width: `${overallPct}%` as any, backgroundColor: Colors.accent }]} />
        </View>
      </View>

      {/* ── LIST ── */}
      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />
      ) : goals.length === 0 ? (
        <EmptyGoals onAdd={() => setShowAdd(true)} />
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

// ─── Empty state — ORIA pattern ───────────────────────────
function EmptyGoals({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name="flag-outline" size={32} color={Colors.amber} />
      </View>
      <Text style={s.emptyTitle}>Sin metas aún</Text>
      <Text style={s.emptySub}>Define una meta financiera y conecta tus ahorros automáticamente.</Text>
      <Pressable
        style={({ pressed }) => [s.emptyBtn, pressed && { opacity: 0.72 }]}
        onPress={onAdd}
      >
        <Text style={s.emptyBtnText}>Crear primera meta</Text>
      </Pressable>
    </View>
  );
}

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

          <Pressable
            style={({ pressed }) => [cm.saveWrap, pressed && { opacity: 0.85 }]}
            onPress={save}
            disabled={saving}
          >
            <View style={cm.saveBtn}>
              {saving
                ? <ActivityIndicator color={Colors.background} />
                : <Text style={cm.saveBtnText}>Confirmar aporte</Text>}
            </View>
          </Pressable>

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
                    color={goalType === t ? Colors.background : Colors.textMuted}
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

          <Pressable
            style={({ pressed }) => [cm.saveWrap, pressed && { opacity: 0.85 }]}
            onPress={save}
            disabled={saving}
          >
            <View style={cm.saveBtn}>
              {saving
                ? <ActivityIndicator color={Colors.background} />
                : <Text style={cm.saveBtnText}>Crear meta</Text>}
            </View>
          </Pressable>

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

  // Header — flat bg, no gradient
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    color: Colors.textPrimary, fontSize: Typography.xl,
    fontWeight: Typography.bold, fontFamily: Typography.fontSansBold,
  },
  // New goal button — flat accent circle
  newGoalBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },

  summaryCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginBottom: Spacing.sm,
  },
  summaryLeft: {},
  summaryLabel: { color: Colors.textMuted, fontSize: Typography.xs, marginBottom: 2 },
  summaryValue: {
    ...NumberTextStyles.kpi,
    color: Colors.textPrimary, fontSize: Typography.xl,
  },
  summaryMeta: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  summaryRight: { alignItems: 'flex-end', gap: 4 },
  summaryStatRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statDot: { width: 7, height: 7, borderRadius: 4 },
  statLabel: { color: Colors.textSecondary, fontSize: Typography.xs },
  // Overall percentage in accent
  overallPct: {
    ...NumberTextStyles.percentageLg,
    color: Colors.accent, fontSize: Typography.lg,
  },

  overallTrack: {
    height: 4, backgroundColor: Colors.border,
    borderRadius: 2, overflow: 'hidden',
  },
  overallFill: { height: 4, borderRadius: 2 },

  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 120 },

  // Goal card — surface bg, 8px radius
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
    gap: Spacing.sm,
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  goalIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  goalName: {
    color: Colors.textPrimary, fontSize: Typography.base,
    fontWeight: Typography.semibold, fontFamily: Typography.fontSansSemibold,
  },
  goalType: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 1 },
  completeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.accentBg, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  completeBadgeText: { color: Colors.accent, fontSize: Typography.xs },
  addBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.accentBg,
    justifyContent: 'center', alignItems: 'center',
  },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  pctLabel: {
    ...NumberTextStyles.percentageSm,
    width: 34, textAlign: 'right',
  },

  amtRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amtLabel: { color: Colors.textMuted, fontSize: Typography.xs, marginBottom: 1 },
  amtValue: { ...NumberTextStyles.amount, fontSize: Typography.sm },
  amtValueMuted: { ...NumberTextStyles.amount, color: Colors.textSecondary, fontSize: Typography.sm },

  goalFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  footerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  footerChipText: { color: Colors.textMuted, fontSize: Typography.xs },
  remainText: { color: Colors.textMuted, fontSize: Typography.xs, marginLeft: 'auto' },

  // Empty state — ORIA pattern
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.amberBg,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: {
    color: Colors.textPrimary, fontSize: Typography.lg,
    fontWeight: Typography.bold, fontFamily: Typography.fontSansBold,
  },
  emptySub: { color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  emptyBtnText: {
    color: Colors.background, fontSize: Typography.base,
    fontWeight: Typography.bold, fontFamily: Typography.fontSansBold,
  },
});

const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surfaceElevated,
    // modal 16px top radius
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 44 : Spacing.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md,
  },
  title: {
    color: Colors.textPrimary, fontSize: Typography.lg,
    fontWeight: Typography.bold, fontFamily: Typography.fontSansBold, marginBottom: 4,
  },
  sub: { color: Colors.textMuted, fontSize: Typography.sm, marginBottom: Spacing.lg },
  field: { marginBottom: Spacing.md },
  fieldLabel: { color: Colors.textSecondary, fontSize: Typography.sm, marginBottom: Spacing.xs },
  // Input fields: surface2 bg, borderLight border
  input: {
    backgroundColor: Colors.surfaceMid, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md, height: 50,
    color: Colors.textPrimary, fontSize: Typography.base,
  },
  // Save button — flat accent bg
  saveWrap: { borderRadius: 10, overflow: 'hidden', marginTop: Spacing.md },
  saveBtn: {
    height: 52, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.accent, borderRadius: 10,
  },
  saveBtnText: {
    color: Colors.background, fontSize: Typography.base,
    fontWeight: Typography.bold, fontFamily: Typography.fontSansBold,
  },
  cancelBtn: { marginTop: Spacing.sm, paddingVertical: Spacing.sm, alignItems: 'center' },
  cancelText: { color: Colors.textMuted, fontSize: Typography.base },
});

const ng = StyleSheet.create({
  sectionLabel: { color: Colors.textSecondary, fontSize: Typography.sm, marginBottom: Spacing.sm },
  typeScroll: { marginBottom: Spacing.lg },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderRadius: 6,
    backgroundColor: Colors.surfaceMid, borderWidth: 1, borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  typeChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  typeChipText: { color: Colors.textMuted, fontSize: Typography.xs },
  typeChipTextActive: { color: Colors.background, fontWeight: Typography.semibold },
  field: { marginBottom: Spacing.md },
  input: {
    backgroundColor: Colors.surfaceMid, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md, height: 50,
    color: Colors.textPrimary, fontSize: Typography.base,
  },
});
