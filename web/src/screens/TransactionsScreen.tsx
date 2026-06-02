import React, { useState, useEffect } from 'react';
import { C, fmt, card } from '../theme';
import { supabase } from '../lib/supabase';
import { TransactionDetailSheet, type TxDetail } from '../components/TransactionDetailSheet';

interface Txn {
  id: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
  notes: string | null;
  gmail_message_id?: string | null;
}

function txIcon(t: Txn): string {
  const d = (t.description ?? '').toLowerCase();
  if (t.transaction_type === 'income') return '💰';
  if (/éxito|carulla|jumbo|d1|ara|supermercad|alkosto/i.test(d)) return '🛒';
  if (/uber|taxi|didi|cabify|sitp/i.test(d)) return '🚗';
  if (/netflix|spotify|disney|hbo|cine/i.test(d)) return '🎬';
  if (/farmacia|droguería|salud|clínica/i.test(d)) return '💊';
  if (/arriendo|renta/i.test(d)) return '🏠';
  if (/retiro|cajero/i.test(d)) return '🏧';
  return '💳';
}

function txCategory(t: Txn): string {
  const d = (t.description ?? '').toLowerCase();
  if (t.transaction_type === 'income') return 'Ingreso';
  if (/éxito|carulla|jumbo|d1|ara|supermercad|alkosto/i.test(d)) return 'Alimentación';
  if (/uber|taxi|didi|cabify|sitp/i.test(d)) return 'Transporte';
  if (/netflix|spotify|disney|hbo|cine/i.test(d)) return 'Entretenimiento';
  if (/farmacia|droguería|salud|clínica/i.test(d)) return 'Salud';
  if (/arriendo|renta/i.test(d)) return 'Vivienda';
  return 'Otros';
}

const TABS = ['Todos', 'Ingresos', 'Gastos'];

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function formatMonthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function TransactionsScreen() {
  const now = new Date();
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState(0);
  const [search, setSearch]             = useState('');
  const [selYear, setSelYear]           = useState(now.getFullYear());
  const [selMonth, setSelMonth]         = useState(now.getMonth()); // 0-indexed
  const [selectedTx, setSelectedTx]     = useState<TxDetail | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      supabase
        .from('transactions')
        .select('id, transaction_type, amount, description, date, notes, gmail_message_id')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .then(({ data }) => {
          setTransactions((data as Txn[]) ?? []);
          setLoading(false);
        });
    });
  }, []);

  function prevMonth() {
    if (selMonth === 0) { setSelYear(y => y - 1); setSelMonth(11); }
    else setSelMonth(m => m - 1);
  }

  function nextMonth() {
    const isCurrentMonth = selYear === now.getFullYear() && selMonth === now.getMonth();
    if (isCurrentMonth) return;
    if (selMonth === 11) { setSelYear(y => y + 1); setSelMonth(0); }
    else setSelMonth(m => m + 1);
  }

  const isCurrentMonth = selYear === now.getFullYear() && selMonth === now.getMonth();
  const monthPrefix = `${selYear}-${String(selMonth + 1).padStart(2, '0')}`;

  const monthTxns = transactions.filter(t => t.date.startsWith(monthPrefix));

  const filtered = monthTxns.filter(t => {
    if (tab === 1 && t.transaction_type !== 'income')  return false;
    if (tab === 2 && t.transaction_type !== 'expense') return false;
    if (search && !(t.description ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped: Record<string, Txn[]> = {};
  filtered.forEach(t => {
    if (!grouped[t.date]) grouped[t.date] = [];
    grouped[t.date].push(t);
  });

  const totalIncome  = monthTxns.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = monthTxns.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ background:'linear-gradient(135deg,#0F2563,#070B14)', padding:'48px 20px 20px' }}>
        <div style={{ color:C.text, fontSize:22, fontWeight:800, marginBottom:2 }}>Movimientos</div>

        {/* Month selector */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, marginBottom:16 }}>
          <button onClick={prevMonth}
            style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:10, width:36, height:36,
              color:C.text, fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ‹
          </button>
          <div style={{ textAlign:'center' }}>
            <div style={{ color:C.text, fontSize:15, fontWeight:700, textTransform:'capitalize' }}>
              {formatMonthLabel(selYear, selMonth)}
            </div>
            {isCurrentMonth && (
              <div style={{ color:C.accent, fontSize:10, fontWeight:600, marginTop:1 }}>MES ACTUAL</div>
            )}
          </div>
          <button onClick={nextMonth}
            style={{ background: isCurrentMonth ? 'transparent' : 'rgba(255,255,255,0.07)',
              border:'none', borderRadius:10, width:36, height:36,
              color: isCurrentMonth ? C.border : C.text,
              fontSize:18, cursor: isCurrentMonth ? 'default' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
            ›
          </button>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <div style={{ flex:1, background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.25)', borderRadius:14, padding:'10px 14px' }}>
            <div style={{ color:C.textMuted, fontSize:11, marginBottom:2 }}>Ingresos</div>
            <div style={{ color:C.accent, fontSize:15, fontWeight:700 }}>{fmt(totalIncome)}</div>
          </div>
          <div style={{ flex:1, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:14, padding:'10px 14px' }}>
            <div style={{ color:C.textMuted, fontSize:11, marginBottom:2 }}>Gastos</div>
            <div style={{ color:C.danger, fontSize:15, fontWeight:700 }}>{fmt(totalExpense)}</div>
          </div>
          <div style={{ flex:1, background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:14, padding:'10px 14px' }}>
            <div style={{ color:C.textMuted, fontSize:11, marginBottom:2 }}>Balance</div>
            <div style={{ color:C.primaryGlow, fontSize:15, fontWeight:700 }}>{fmt(totalIncome - totalExpense)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        <div style={{ display:'flex', alignItems:'center', background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:'0 14px', height:44, marginBottom:14 }}>
          <span style={{ color:C.textMuted, marginRight:8, fontSize:15 }}>🔍</span>
          <input
            style={{ flex:1, background:'none', border:'none', outline:'none', color:C.text, fontSize:14 }}
            placeholder="Buscar movimiento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display:'flex', background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, padding:4, marginBottom:16, gap:4 }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              flex:1, padding:'8px 0', borderRadius:10, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
              background: tab === i ? C.accent : 'transparent',
              color: tab === i ? '#fff' : C.textMuted,
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:'0 16px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:C.textMuted }}>
            <div style={{ fontSize:14 }}>Cargando movimientos…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:C.textMuted }}>
            <div style={{ fontSize:40, marginBottom:12 }}>💸</div>
            <div style={{ fontSize:14 }}>
              {transactions.length === 0
                ? 'Conecta Gmail en Configurar para importar movimientos'
                : `Sin movimientos en ${formatMonthLabel(selYear, selMonth).toLowerCase()}`}
            </div>
          </div>
        ) : (
          Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([date, txns]) => (
            <div key={date} style={{ marginBottom:20 }}>
              <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, marginBottom:8, textTransform:'uppercase' }}>
                {new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { weekday:'long', day:'2-digit', month:'long' })}
              </div>
              <div style={{ ...card }}>
                {txns.map((t, i) => (
                  <div key={t.id}
                    onClick={() => setSelectedTx(t)}
                    style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:i<txns.length-1?12:0, marginBottom:i<txns.length-1?12:0, borderBottom:i<txns.length-1?`1px solid ${C.border}`:'none', cursor:'pointer' }}>
                    <div style={{ width:42, height:42, borderRadius:13, background:`${t.transaction_type==='income'?C.accent:C.primaryGlow}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{txIcon(t)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:C.text, fontSize:14, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.description ?? 'Movimiento'}</div>
                      <div style={{ color:C.textMuted, fontSize:11, marginTop:2 }}>{txCategory(t)}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0, display:'flex', alignItems:'center', gap:8 }}>
                      <div>
                        <div style={{ color:t.transaction_type==='income'?C.accent:C.text, fontSize:14, fontWeight:700 }}>
                          {t.transaction_type==='income'?'+':'-'}{fmt(Number(t.amount))}
                        </div>
                        <div style={{ color:C.textMuted, fontSize:10, marginTop:1 }}>{t.transaction_type==='income'?'Ingreso':'Gasto'}</div>
                      </div>
                      <span style={{ color:C.border, fontSize:16 }}>›</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <TransactionDetailSheet tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </div>
  );
}
