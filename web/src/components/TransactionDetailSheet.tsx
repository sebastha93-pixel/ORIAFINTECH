import React from 'react';
import { C, fmt } from '../theme';

export interface TxDetail {
  id: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
  notes?: string | null;
  gmail_message_id?: string | null;
}

interface Props {
  tx: TxDetail | null;
  onClose: () => void;
}

function txIcon(t: TxDetail): string {
  const d = (t.description ?? '').toLowerCase();
  if (t.transaction_type === 'income') return '💰';
  if (/éxito|carulla|jumbo|d1|ara|supermercad|alkosto/i.test(d)) return '🛒';
  if (/uber|taxi|didi|cabify|sitp/i.test(d)) return '🚗';
  if (/netflix|spotify|disney|hbo|cine/i.test(d)) return '🎬';
  if (/farmacia|droguería|salud|clínica/i.test(d)) return '💊';
  if (/arriendo|renta/i.test(d)) return '🏠';
  if (/retiro|cajero/i.test(d)) return '🏧';
  if (/transferencia/i.test(d)) return '🔄';
  return '💳';
}

function txCategory(t: TxDetail): string {
  const d = (t.description ?? '').toLowerCase();
  if (t.transaction_type === 'income') {
    if (/nómin|salari|abono/i.test(d)) return 'Salario';
    if (/transferencia/i.test(d)) return 'Transferencia';
    return 'Ingreso';
  }
  if (/éxito|carulla|jumbo|d1|ara|supermercad|alkosto/i.test(d)) return 'Alimentación';
  if (/uber|taxi|didi|cabify|sitp/i.test(d)) return 'Transporte';
  if (/netflix|spotify|disney|hbo|cine/i.test(d)) return 'Entretenimiento';
  if (/farmacia|droguería|salud|clínica/i.test(d)) return 'Salud';
  if (/arriendo|renta/i.test(d)) return 'Vivienda';
  if (/transferencia/i.test(d)) return 'Transferencia';
  return 'Otros';
}

export function TransactionDetailSheet({ tx, onClose }: Props) {
  if (!tx) return null;

  const isIncome = tx.transaction_type === 'income';
  const color    = isIncome ? C.accent : C.danger;
  const category = txCategory(tx);
  const icon     = txIcon(tx);

  const dateFormatted = new Date(tx.date + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const source = tx.gmail_message_id
    ? 'Importado desde Gmail'
    : 'Ingresado manualmente';

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(8,20,38,0.8)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:C.surface, borderRadius:'24px 24px 0 0', width:'100%', maxWidth:480, border:`1px solid ${C.border}`, paddingBottom:32 }}>
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
            {isIncome ? '+' : '-'}{fmt(Number(tx.amount))}
          </div>
          <div style={{ display:'inline-block', marginTop:6, background:`${color}18`, borderRadius:20, padding:'3px 12px' }}>
            <span style={{ color, fontSize:12, fontWeight:700 }}>
              {isIncome ? '↑ INGRESO' : '↓ GASTO'}
            </span>
          </div>
        </div>

        {/* Detail rows */}
        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:2 }}>
          <Row label="Descripción"  value={tx.description ?? 'Sin descripción'} />
          <Row label="Categoría"    value={category} />
          <Row label="Fecha"        value={dateFormatted} capitalize />
          <Row label="Origen"       value={source} />
          {tx.notes && tx.notes !== 'Auto-importado' && (
            <Row label="Notas" value={tx.notes} />
          )}
        </div>

        <div style={{ padding:'20px 20px 0' }}>
          <button
            onClick={onClose}
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
