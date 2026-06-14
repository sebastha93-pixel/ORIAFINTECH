import React, { useState, useEffect } from 'react';
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
  onCategoryChanged?: (id: string, category: string) => void;
  onNotesChanged?: (id: string, notes: string) => void;
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
  { label: 'Efectivo',        icon: '🏧' },
  { label: 'Transferencias',  icon: '🔄' },
  { label: 'Gasolina',        icon: '⛽' },
  { label: 'Restaurante',     icon: '🍽️' },
  { label: 'Otros',           icon: '📦' },
  { label: '__custom__',      icon: '✏️' },
];

const CUSTOM_MARKER = '__custom__';

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

function userNote(raw: string | null | undefined): string {
  if (!raw || raw === 'Auto-importado' || raw === 'Ingresado manualmente') return '';
  return raw;
}

export function TransactionDetailSheet({ tx, onClose, onCategoryChanged, onNotesChanged }: Props) {
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [catSaving, setCatSaving]         = useState(false);
  const [customCat, setCustomCat]         = useState('');
  const [notesSaving, setNotesSaving]     = useState(false);
  const [notesSaved, setNotesSaved]       = useState(false);
  const [editNotes, setEditNotes]         = useState<string | null>(null);
  const [lastTxId, setLastTxId]           = useState<string | null>(null);

  // Lock body scroll while sheet is open (prevents background scroll on iOS)
  useEffect(() => {
    if (!tx) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [tx]);

  if (!tx) return null;
  const t = tx;

  // Reset local notes state when a different transaction is opened
  if (lastTxId !== t.id) {
    setEditNotes(userNote(t.notes));
    setLastTxId(t.id);
    setNotesSaved(false);
    setShowCatPicker(false);
  }

  const notes      = editNotes ?? userNote(t.notes);
  const isIncome   = t.transaction_type === 'income';
  const color      = isIncome ? C.accent : C.danger;
  const category   = txCategory(t.description ?? '', t.transaction_type, t.category);
  const icon       = txIcon(t.description ?? '', t.transaction_type, t.category);
  const origin     = t.gmail_message_id ? 'Importado desde Gmail' : 'Ingresado manualmente';

  const dateFormatted = new Date(t.date + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  async function handleCategorySelect(cat: string) {
    setCatSaving(true);
    const { error } = await supabase.from('transactions').update({ category: cat }).eq('id', t.id);
    setCatSaving(false);
    if (!error) {
      onCategoryChanged?.(t.id, cat);
      setShowCatPicker(false);
    }
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    const val = notes.trim() || null;
    const { error } = await supabase.from('transactions').update({ notes: val }).eq('id', t.id);
    setNotesSaving(false);
    if (!error) {
      onNotesChanged?.(t.id, notes.trim());
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    }
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(8,20,38,0.85)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:C.surface, borderRadius:'24px 24px 0 0', width:'100%', maxWidth:480, border:`1px solid ${C.border}`, paddingBottom:32, maxHeight:'92vh', overflowY:'auto', WebkitOverflowScrolling:'touch' as never, overscrollBehavior:'contain' }}>
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

          {/* Category row — tappable edit button */}
          <div style={{ padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:C.textMuted, fontSize:13 }}>Categoría</span>
              <button
                onClick={() => { setShowCatPicker(p => !p); setCustomCat(''); }}
                style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(59,130,246,0.12)',
                  border:`1px solid rgba(59,130,246,0.3)`, borderRadius:20,
                  padding:'5px 12px', cursor:'pointer' }}>
                <span style={{ color:C.primaryGlow, fontSize:13, fontWeight:600 }}>{category}</span>
                <span style={{ fontSize:11 }}>{showCatPicker ? '▲' : '✏️'}</span>
              </button>
            </div>

            {/* Inline picker */}
            {showCatPicker && (
              <div style={{ marginTop:12 }}>
                <div style={{ color:C.textMuted, fontSize:10, fontWeight:600, letterSpacing:0.5, marginBottom:10 }}>SELECCIONAR CATEGORÍA</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {CATEGORIES.map(c => {
                    const isCustom = c.label === CUSTOM_MARKER;
                    const isSel = isCustom
                      ? !CATEGORIES.some(x => x.label !== CUSTOM_MARKER && x.label === category)
                        && !!customCat.trim()
                      : category === c.label;
                    return (
                      <button key={c.label}
                        disabled={catSaving}
                        onClick={() => {
                          if (isCustom) return; // handled by save button below
                          void handleCategorySelect(c.label);
                        }}
                        style={{ padding:'10px 4px', borderRadius:12,
                          border:`1px solid ${isSel ? C.primaryGlow : C.border}`,
                          background: isSel ? 'rgba(59,130,246,0.15)' : C.bg,
                          cursor: catSaving ? 'default' : 'pointer', textAlign:'center',
                          opacity: catSaving ? 0.6 : 1 }}>
                        <div style={{ fontSize:18, marginBottom:2 }}>{c.icon}</div>
                        <div style={{ color: isSel ? C.primaryGlow : C.textMuted, fontSize:9, fontWeight:600, lineHeight:1.2 }}>
                          {isCustom ? 'Personalizada' : c.label}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom category input */}
                <div style={{ marginTop:10, display:'flex', gap:8 }}>
                  <input
                    style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:10,
                      color:C.text, fontSize:13, padding:'9px 12px', outline:'none', fontFamily:'inherit' }}
                    placeholder="Nombre personalizado (Hijos, Mascota…)"
                    value={customCat}
                    onChange={e => setCustomCat(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customCat.trim()) void handleCategorySelect(customCat.trim());
                    }}
                  />
                  <button
                    disabled={catSaving || !customCat.trim()}
                    onClick={() => void handleCategorySelect(customCat.trim())}
                    style={{ padding:'9px 14px', borderRadius:10, border:'none',
                      background: customCat.trim() ? C.primaryGlow : C.border,
                      color:'#fff', fontSize:13, fontWeight:700,
                      cursor: customCat.trim() ? 'pointer' : 'default',
                      opacity: catSaving ? 0.6 : 1 }}>
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>

          <Row label="Fecha"  value={dateFormatted} capitalize />
          <Row label="Origen" value={origin} />

          {/* Editable notes */}
          <div style={{ padding:'12px 0' }}>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:0.5, marginBottom:8 }}>NOTAS</div>
            <textarea
              rows={3}
              placeholder="Agrega contexto a este movimiento…"
              value={notes}
              onChange={e => { setEditNotes(e.target.value); setNotesSaved(false); }}
              style={{ width:'100%', boxSizing:'border-box', background:C.bg,
                border:`1px solid ${C.border}`, borderRadius:12,
                color:C.text, fontSize:13, padding:'10px 12px', outline:'none',
                resize:'none', fontFamily:'inherit', lineHeight:1.5 }}
            />
            <button
              onClick={handleSaveNotes}
              disabled={notesSaving}
              style={{ marginTop:8, width:'100%', padding:'10px 0', borderRadius:12,
                border:`1px solid ${notesSaved ? C.accent : C.border}`,
                background: notesSaved ? `${C.accent}22` : 'transparent',
                color: notesSaved ? C.accent : C.textSec,
                fontSize:13, fontWeight:600, cursor:'pointer' }}>
              {notesSaving ? 'Guardando…' : notesSaved ? '✓ Nota guardada' : 'Guardar nota'}
            </button>
          </div>
        </div>

        {/* Close */}
        <div style={{ padding:'8px 20px 0' }}>
          <button onClick={onClose}
            style={{ width:'100%', padding:'14px 0', borderRadius:14, border:`1px solid ${C.border}`, background:'transparent', color:C.textSec, fontSize:15, fontWeight:600, cursor:'pointer' }}>
            Cerrar
          </button>
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
