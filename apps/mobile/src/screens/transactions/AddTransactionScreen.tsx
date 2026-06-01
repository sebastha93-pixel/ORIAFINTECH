import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Platform, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { api } from '../../services/api';
import { Account, Category, TransactionType } from '../../types';

// ─── helpers ───────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

const CATEGORY_ICONS: Record<string, string> = {
  Salario: 'briefcase', Freelance: 'laptop', Inversiones: 'trending-up',
  Vivienda: 'home', Alimentación: 'restaurant', Transporte: 'car',
  Entretenimiento: 'game-controller', Salud: 'medkit', Educación: 'school',
  Ropa: 'shirt', Tecnología: 'phone-portrait', Viajes: 'airplane',
  Deporte: 'fitness', Mascotas: 'paw', Regalos: 'gift',
  Suscripciones: 'repeat', Impuestos: 'document-text',
};

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

// ─── Component ─────────────────────────────────────────────
export function AddTransactionScreen({ onClose, onSaved }: Props) {
  const [txType, setTxType]       = useState<TransactionType>('expense');
  const [amount, setAmount]       = useState('');
  const [description, setDesc]    = useState('');
  const [date, setDate]           = useState(today());
  const [accountId, setAccountId] = useState<string>('');
  const [categoryId, setCatId]    = useState<string>('');
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [categories, setCats]     = useState<Category[]>([]);
  const [isSaving, setIsSaving]   = useState(false);
  const [showAccPicker, setShowAccPicker] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  useEffect(() => {
    Promise.all([api.getAccounts(), api.getCategories()]).then(([accs, cats]) => {
      setAccounts(accs);
      if (accs.length) setAccountId(accs[0].id);
      setCats(cats);
    });
  }, []);

  const filteredCats = categories.filter(
    (c) => c.category_type === txType || c.category_type === 'transfer',
  );

  const selectedAcc = accounts.find((a) => a.id === accountId);
  const selectedCat = categories.find((c) => c.id === categoryId);

  const handleSave = async () => {
    const num = parseFloat(amount.replace(',', '.'));
    if (!num || num <= 0) { Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0'); return; }
    if (!accountId) { Alert.alert('Cuenta requerida', 'Selecciona una cuenta'); return; }

    setIsSaving(true);
    try {
      await api.createTransaction({
        transaction_type: txType,
        amount: num,
        description: description.trim() || undefined,
        account_id: accountId,
        category_id: categoryId || undefined,
        date,
      });
      onSaved();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la transacción. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const isIncome = txType === 'income';

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient colors={['#0D1B3E', Colors.background]} style={s.header}>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nuevo movimiento</Text>
        <View style={{ width: 34 }} />
      </LinearGradient>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Type toggle */}
        <View style={s.typeRow}>
          {(['expense', 'income'] as TransactionType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.typeBtn, txType === t && (t === 'income' ? s.typeBtnIncome : s.typeBtnExpense)]}
              onPress={() => { setTxType(t); setCatId(''); }}
            >
              <Ionicons
                name={t === 'income' ? 'arrow-down' : 'arrow-up'}
                size={16}
                color={txType === t ? '#fff' : Colors.textMuted}
              />
              <Text style={[s.typeBtnText, txType === t && s.typeBtnTextActive]}>
                {t === 'income' ? 'Ingreso' : 'Gasto'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <View style={s.amountWrap}>
          <Text style={s.currencyLabel}>$</Text>
          <TextInput
            style={s.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={Colors.border}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Fields */}
        <View style={s.fields}>
          {/* Description */}
          <View style={s.field}>
            <Ionicons name="create-outline" size={18} color={Colors.textMuted} style={s.fieldIcon} />
            <TextInput
              style={s.fieldInput}
              placeholder="Descripción (opcional)"
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDesc}
              returnKeyType="next"
            />
          </View>

          {/* Account picker */}
          <TouchableOpacity style={s.field} onPress={() => setShowAccPicker(true)}>
            <Ionicons name="card-outline" size={18} color={Colors.textMuted} style={s.fieldIcon} />
            <Text style={selectedAcc ? s.fieldValue : s.fieldPlaceholder}>
              {selectedAcc ? `${selectedAcc.name}` : 'Selecciona cuenta'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Category picker */}
          <TouchableOpacity style={s.field} onPress={() => setShowCatPicker(true)}>
            <Ionicons name="pricetag-outline" size={18} color={Colors.textMuted} style={s.fieldIcon} />
            <Text style={selectedCat ? s.fieldValue : s.fieldPlaceholder}>
              {selectedCat ? selectedCat.name : 'Categoría (opcional)'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Date */}
          <View style={s.field}>
            <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} style={s.fieldIcon} />
            <TextInput
              style={s.fieldInput}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity style={s.saveWrap} onPress={handleSave} disabled={isSaving}>
          <LinearGradient
            colors={isIncome ? Colors.gradientAccent : [Colors.primaryGlow, Colors.primary] as [string,string]}
            style={s.saveBtn}
          >
            {isSaving
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={s.saveBtnText}>Guardar movimiento</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Account picker modal */}
      <PickerModal
        visible={showAccPicker}
        title="Selecciona cuenta"
        onClose={() => setShowAccPicker(false)}
        items={accounts.map((a) => ({
          id: a.id,
          label: a.name,
          sub: a.institution || a.account_type,
          icon: 'card' as const,
          color: (Colors.accounts as Record<string, string>)[a.account_type] || Colors.primary,
        }))}
        selected={accountId}
        onSelect={(id) => { setAccountId(id); setShowAccPicker(false); }}
      />

      {/* Category picker modal */}
      <PickerModal
        visible={showCatPicker}
        title="Selecciona categoría"
        onClose={() => setShowCatPicker(false)}
        items={filteredCats.map((c) => ({
          id: c.id,
          label: c.name,
          sub: '',
          icon: (CATEGORY_ICONS[c.name] || 'pricetag') as 'home',
          color: c.color || Colors.accent,
        }))}
        selected={categoryId}
        onSelect={(id) => { setCatId(id); setShowCatPicker(false); }}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Picker modal ──────────────────────────────────────────
interface PickerItem { id: string; label: string; sub: string; icon: 'home'; color: string; }
interface PickerProps {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

function PickerModal({ visible, title, items, selected, onSelect, onClose }: PickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pm.overlay}>
        <View style={pm.sheet}>
          <View style={pm.handle} />
          <Text style={pm.title}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[pm.item, selected === item.id && pm.itemActive]}
                onPress={() => onSelect(item.id)}
              >
                <View style={[pm.itemIcon, { backgroundColor: item.color + '25' }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pm.itemLabel}>{item.label}</Text>
                  {item.sub ? <Text style={pm.itemSub}>{item.sub}</Text> : null}
                </View>
                {selected === item.id && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={pm.cancelBtn} onPress={onClose}>
            <Text style={pm.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Spacing.md, paddingHorizontal: Spacing.lg,
  },
  closeBtn: { padding: 4 },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: Typography.bold },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 80 },

  typeRow: {
    flexDirection: 'row', gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: 4, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  typeBtnIncome: { backgroundColor: Colors.accent },
  typeBtnExpense: { backgroundColor: Colors.primaryGlow },
  typeBtnText: { color: Colors.textMuted, fontSize: Typography.base, fontWeight: Typography.medium },
  typeBtnTextActive: { color: '#fff', fontWeight: Typography.semibold },

  amountWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.lg,
  },
  currencyLabel: { color: Colors.textSecondary, fontSize: Typography.xl, fontWeight: Typography.bold },
  amountInput: {
    color: Colors.textPrimary, fontSize: 52, fontWeight: Typography.extrabold,
    minWidth: 120, textAlign: 'center',
  },

  fields: { gap: Spacing.sm },
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, height: 54,
  },
  fieldIcon: { marginRight: Spacing.sm },
  fieldInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.base },
  fieldValue: { flex: 1, color: Colors.textPrimary, fontSize: Typography.base },
  fieldPlaceholder: { flex: 1, color: Colors.textMuted, fontSize: Typography.base },

  saveWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.md },
  saveBtn: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: Spacing.sm,
  },
  saveBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg, maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 44 : Spacing.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md,
  },
  title: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: Typography.bold, marginBottom: Spacing.md },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm, borderRadius: BorderRadius.lg, marginBottom: Spacing.xs,
  },
  itemActive: { backgroundColor: Colors.accent + '15' },
  itemIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemLabel: { color: Colors.textPrimary, fontSize: Typography.base },
  itemSub: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  cancelBtn: {
    marginTop: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  cancelText: { color: Colors.textSecondary, fontSize: Typography.base },
});
