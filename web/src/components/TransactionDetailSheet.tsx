import React, { useState } from 'react';
import { C, fmt } from '../theme';
import { supabase } from '../lib/supabase';

export interface TxDetail {
  id: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
  notes?: string | null;
  gmail_message_id?: string | null;
  category?: string | null;
}

interface Props {
  tx: TxDetail | null;
  onClose: () => void;
  onDeleted?: (id: string) => void;
  onCategoryChanged?: (id: string, category: string) => void;
}

const CATEGORIES: { label: string; icon: string }[] = [
  { label: 'Alimentación',    icon: '🛒' },
  { label: 'Transporte',      icon: '🚗' },
  { label: 'Entretenimiento', icon: '🎬' },
  { label: 'Salud',           icon: '💊' },
  { label: 'Vivienda',        icon: '🏠' },
  { label: 'Deporte',         icon: '👟' },
  { label: 'Educación',       icon: '📚' },
  { label: 'Servicios',       icon: '💡' },
  { label: 'Ropa',            icon: '👔' },
  { label: 'Salario',         icon: '💰' },
  { label: 'Efectivo',        icon: '🏧' },
  { label: 'Transferencias',  icon: '🔄' },
  { label: 'Gasolina',        icon: '⛽' },
  { label: 'Restaurante',     icon: '🍽️' },
  { label: 'Otros',           icon: '💳' },
];

export function txIcon(desc: string, type: 'income' | 'expense', cat?: string | null): string {
  const d = (desc + ' ' + (cat ?? '')).toLowerCase();
  if (type === 'income') return '💰';
  if (/éxito|carulla|jumbo|d1|ara|supermercad|alkosto|olímpica|olimpica/i.test(d)) return '🛒';
  if (/restaurante|comida|domicilio|rappi|ifood|uber eats|mcdonald|kfc|subway/i.test(d)) return '🍽️';
  if (/gasolina|combustible|terpel|primax|biomax|esso|gulf|zeuss/i.test(d)) return '⛽';
  if (/parqueadero|peaje/i.test(d)) return '🅿️';
  if (/uber|taxi|didi|cabify|sitp|bus|metro|mio/i.test(d)) return '🚗';
  if (/netflix|spotify|disney|hbo|prime|youtube|streaming|cine|teatro|concierto|cinemark|procinal/i.test(d)) return '🎬';
  if (/farmacia|droguería|drogueria|salud|clínica|clinica|hospital|médico|medico|óptica|optica/i.test(d)) return '💊';
  if (/gym|bodytech|smartfit|gimnasio|deporte|fitness/i.test(d)) return '👟';
  if (/arriendo|renta/i.test(d)) return '🏠';
  if (/colegio|universidad|escuela|curso|educación/i.test(d)) return '📚';
  if (/agua|energía|gas\b|internet|teléfono|celular|epm|acueducto|claro|movistar|tigo/i.test(d)) return '💡';
  if (/ropa|calzado|falabella|zara|studio f/i.test(d)) return '👔';
  if (/retiro|cajero/i.test(d)) return '🏧';
  if (/transferencia/i.test(d)) return '🔄';
  return '💳';
}

export function txCategory(desc: string, type: 'income' | 'expense', stored?: string | null): string {
  if (stored && stored !== 'Otros') return stored;
  const d = (desc ?? '').toLowerCase();
  if (type === 'income') {
    if (/nómin|salari|abono/i.test(d)) return 'Salario';
    if (/transferencia/i.test(d)) return 'Transferencias';
    return 'Ingreso';
  }
  if (/éxito|carulla|jumbo|d1|ara|supermercad|alkosto|olímpica|olimpica/i.test(d)) return 'Alimentación';
  if (/restaurante|comida|domicilio|rappi|ifood|mcdonald|kfc|subway/i.test(d)) return 'Restaurante';
  if (/gasolina|combustible|terpel|primax|biomax|esso|gulf|zeuss/i.test(d)) return 'Gasolina';
  if (/parqueadero|peaje|uber|taxi|didi|cabify|sitp|bus|metro|mio|transporte/i.test(d)) return 'Transporte';
  if (/netflix|spotify|disney|hbo|prime|streaming|cine|teatro|concierto|cinemark|procinal/i.test(d)) return 'Entretenimiento';
  if (/farmacia|droguería|drogueria|salud|clínica|clinica|hospital|médico|medico/i.test(d)) return 'Salud';
  if (/gym|bodytech|smartfit|gimnasio|deporte|fitness/i.test(d)) return 'Deporte';
  if (/arriendo|renta/i.test(d)) return 'Vivienda';
  if (/colegio|universidad|escuela|curso|educación/i.test(d)) return 'Educación';
  if (/agua|energía|gas\b|internet|teléfono|celular|epm|acueducto|claro|movistar|tigo/i.test(d)) return 'Servicios';
  if (/ropa|calzado|falabella|zara|ripley/i.test(d)) return 'Ropa';
  if (/retiro|cajero|efectivo/i.test(d)) return 'Efectivo';
  if (/transferencia/i.test(d)) return 'Transferencias';
  return stored ?? 'Otros';
}

export function TransactionDetailSheet({ tx, onClose, onDeleted, onCategoryChanged }: Props) {
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!tx) return null;
  const t = tx; // stable non-null ref for async callbacks

  const isIncome  = t.transaction_type === 'income';
  const color     = isIncome ? C.accent : C.danger;
  const category  = txCategory(t.description ?? '', t.transaction_type, t.category);
  const icon      = txIcon(t.description ?? '', t.transaction_type, t.category);

  const dateFormatted = new Date(t.date + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  async function handleCategorySelect(cat: string) {
    setSaving(true);
    const { error } = await supabase.from('transactions').update({ category: cat }).eq('id', t.id);
    setSaving(false);
    if (!error) {
      onCategoryChanged?.(t.id, cat);
      setShowCatPicker(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    const { error } = await supabase.from('transactions').delete().eq('id', t.id);
    setSaving(false);
    if (!error) {
      onDeleted?.(t.id);
      onClose();
    }
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(8,20,38,0.85)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:C.surface, borderRadius:'24px 24px 0 0', width:'100%', maxWidth:480, border:`1px solid ${C.border}`, paddingBottom:32, maxHeight:'92vh', overflowY:'auto' }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 8px' }}>
          <div style={{ width:40, height:4, borderRadius:2, background:C.border }} />
        </div>

        {/* Icon + amount */}
        <div style={{ textAlign:'center', padding:'12px 24px 20px' }}>
          <div style={{ width:64, height:64, borderRadius:20, background:`${color}22`, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:30, marginBottom:12 }}>
            {icon}
          </div>
          <div style={{ color, fontSize:32, fontWeight:800, letterSpacing:-1 }}>
            {isIncome ? '+' : '-'}{fmt(Number(t.amount))}
          </div>
          <div style={{ display:'inline-block', marginTop:6, background:`${color}18`, borderRadius:20, padding:'3px 12px' }}>
            <span style={{ color, fontSize:12, fontWeight:700 }}>
              {isIncome ? '↑ INGRESO' : '↓ GASTO'}
            </span>
          </div>
        </div>

        {/* Detail rows */}
        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:2 }}>
          <Row label="Descripción" value={t.description ?? 'Sin descripción'} />

          {/* Category row — tappable */}
          <div
            style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 0', borderBottom:`1px solid ${C.border}`, cursor:'pointer' }}
            onClick={() => setShowCatPicker(p => !p)}
          >
            <span style={{ color:C.textMuted, fontSize:13 }}>Categoría</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ color:C.primaryGlow, fontSize:13, fontWeight:600 }}>{category}</span>
              <span style={{ color:C.textMuted, fontSize:11 }}>✏️</span>
            </div>
          </div>

          {/* Category picker */}
          {showCatPicker && (
            <div style={{ padding:'12px 0', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ color:C.textMuted, fontSize:10, fontWeight:600, letterSpacing:0.5, marginBottom:10 }}>SELECCIONAR CATEGORÍA</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {CATEGORIES.map(c => {
                  const isSel = category === c.label;
                  return (
                    <button key={c.label}
                      disabled={saving}
                      onClick={() => handleCategorySelect(c.label)}
                      style={{ padding:'10px 4px', borderRadius:12,
                        border:`1px solid ${isSel ? C.primaryGlow : C.border}`,
                        background: isSel ? 'rgba(59,130,246,0.15)' : C.bg,
                        cursor:'pointer', textAlign:'center' }}>
                      <div style={{ fontSize:18, marginBottom:2 }}>{c.icon}</div>
                      <div style={{ color: isSel ? C.primaryGlow : C.textMuted, fontSize:9, fontWeight:600, lineHeight:1.2 }}>{c.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Row label="Fecha" value={dateFormatted} capitalize />
          <Row label="Origen" value={t.gmail_message_id ? 'Importado desde Gmail' : 'Ingresado manualmente'} />
          {t.notes && t.notes !== 'Auto-importado' && (
            <Row label="Notas" value={t.notes} />
          )}
        </div>

        {/* Actions */}
        <div style={{ padding:'20px 20px 0', display:'flex', flexDirection:'column', gap:10 }}>
          {!showDeleteConfirm ? (
            <>
              <button onClick={onClose}
                style={{ width:'100%', padding:'14px 0', borderRadius:14, border:`1px solid ${C.border}`, background:'transparent', color:C.textSec, fontSize:15, fontWeight:600, cursor:'pointer' }}>
                Cerrar
              </button>
              <button onClick={() => setShowDeleteConfirm(true)}
                style={{ width:'100%', padding:'12px 0', borderRadius:14, border:`1px solid ${C.danger}33`, background:`${C.danger}11`, color:C.danger, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Eliminar movimiento
              </button>
            </>
          ) : (
            <>
              <div style={{ textAlign:'center', color:C.textMuted, fontSize:13, marginBottom:4 }}>¿Eliminar este movimiento?</div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setShowDeleteConfirm(false)}
                  style={{ flex:1, padding:'13px 0', borderRadius:14, border:`1px solid ${C.border}`, background:'transparent', color:C.textSec, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleDelete} disabled={saving}
                  style={{ flex:1, padding:'13px 0', borderRadius:14, border:'none', background:C.danger, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  {saving ? '…' : 'Eliminar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'11px 0', borderBottom:`1px solid ${C.border}` }}>
      <span style={{ color:C.textMuted, fontSize:13, flexShrink:0, marginRight:16 }}>{label}</span>
      <span style={{ color:C.text, fontSize:13, fontWeight:500, textAlign:'right', textTransform: capitalize ? 'capitalize' : 'none' }}>
        {value}
      </span>
    </div>
  );
}
