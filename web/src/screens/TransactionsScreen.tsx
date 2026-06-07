import React, { useState, useEffect, useCallback } from 'react';
import { C, fmt, card } from '../theme';
import { supabase } from '../lib/supabase';
import { TransactionDetailSheet, txIcon, txCategory, type TxDetail } from '../components/TransactionDetailSheet';

interface Txn {
  id: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
  notes: string | null;
  gmail_message_id?: string | null;
  category?: string | null;
}

interface Account {
  id: string;
  name: string;
  institution: string;
}

const CATEGORIES_LIST = [
  'Alimentación','Transporte','Entretenimiento','Salud','Vivienda',
  'Deporte','Educación','Servicios','Ropa','Salario',
  'Efectivo','Transferencias','Gasolina','Restaurante','Otros',
];

function AddTransactionModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType]           = useState<'expense' | 'income'>('expense');
  const [amount, setAmount]       = useState('');
  const [description, setDesc]    = useState('');
  const [category, setCategory]   = useState('Otros');
  const [date, setDate]           = useState(today);
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('accounts').select('id, name, institution').eq('user_id', user.id).eq('is_active', true);
      const accs = (data as Account[]) ?? [];
      setAccounts(accs);
      if (accs.length === 1) setAccountId(accs[0].id);
    });
  }, []);

  async function handleSave() {
    const num = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!num || num <= 0) { setError('Ingresa un monto válido'); return; }
    if (!description.trim()) { setError('Ingresa una descripción'); return; }
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const row: Record<string, unknown> = {
      user_id: user.id,
      transaction_type: type,
      amount: num,
      description: description.trim(),
      category,
      date,
      notes: 'Ingresado manualmente',
      ...(accountId ? { account_id: accountId } : {}),
    };
    const { error: err } = await supabase.from('transactions').insert(row);
    setSaving(false);
    if (err) { setError('Error al guardar. Intenta de nuevo.'); return; }
    onSaved();
    onClose();
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
    color: C.text, fontSize: 15, padding: '12px 14px', outline: 'none',
  };

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(8,20,38,0.88)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:C.surface, borderRadius:'24px 24px 0 0', width:'100%', maxWidth:480, border:`1px solid ${C.border}`, paddingBottom:32, maxHeight:'95vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 8px' }}>
          <div style={{ width:40, height:4, borderRadius:2, background:C.border }} />
        </div>

        <div style={{ padding:'4px 20px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ color:C.text, fontSize:17, fontWeight:700 }}>Nuevo movimiento</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.textMuted, fontSize:22, cursor:'pointer', lineHeight:1 }}>×</button>
        </div>

        {/* Type toggle */}
        <div style={{ padding:'0 20px', marginBottom:16 }}>
          <div style={{ display:'flex', background:C.bg, borderRadius:14, border:`1px solid ${C.border}`, padding:4, gap:4 }}>
            {(['expense','income'] as const).map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                flex:1, padding:'10px 0', borderRadius:10, border:'none', cursor:'pointer', fontSize:14, fontWeight:700,
                background: type === t ? (t === 'income' ? C.accent : C.danger) : 'transparent',
                color: type === t ? '#fff' : C.textMuted,
              }}>
                {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {/* Amount */}
          <div>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:0.5, marginBottom:6 }}>MONTO</div>
            <input
              style={inp}
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:0.5, marginBottom:6 }}>DESCRIPCIÓN</div>
            <input
              style={inp}
              type="text"
              placeholder="Ej: Mercado, Gasolina, Restaurante..."
              value={description}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          {/* Category */}
          <div>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:0.5, marginBottom:6 }}>CATEGORÍA</div>
            <select style={{ ...inp, appearance:'none' }} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES_LIST.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Date */}
          <div>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:0.5, marginBottom:6 }}>FECHA</div>
            <input style={inp} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Account (only if multiple) */}
          {accounts.length > 1 && (
            <div>
              <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:0.5, marginBottom:6 }}>CUENTA</div>
              <select style={{ ...inp, appearance:'none' }} value={accountId} onChange={e => setAccountId(e.target.value)}>
                <option value="">Sin cuenta específica</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} – {a.institution}</option>)}
              </select>
            </div>
          )}

          {error && <div style={{ color:C.danger, fontSize:13, textAlign:'center' }}>{error}</div>}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width:'100%', padding:'15px 0', borderRadius:14, border:'none',
              background: type === 'income' ? C.accent : C.danger,
              color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', marginTop:4 }}>
            {saving ? 'Guardando…' : 'Guardar movimiento'}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [selMonth, setSelMonth]         = useState(now.getMonth());
  const [selectedTx, setSelectedTx]     = useState<TxDetail | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadTransactions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('transactions')
      .select('id, transaction_type, amount, description, date, notes, gmail_message_id, category')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    setTransactions((data as Txn[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  function prevMonth() {
    if (selMonth === 0) { setSelYear(y => y - 1); setSelMonth(11); }
    else setSelMonth(m => m - 1);
  }

  function nextMonth() {
    const isCurrent = selYear === now.getFullYear() && selMonth === now.getMonth();
    if (isCurrent) return;
    if (selMonth === 11) { setSelYear(y => y + 1); setSelMonth(0); }
    else setSelMonth(m => m + 1);
  }

  function handleCategoryChanged(id: string, category: string) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, category } : t));
    setSelectedTx(prev => prev && prev.id === id ? { ...prev, category } : prev);
  }

  function handleDeleted(id: string) {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }

  const isCurrent = selYear === now.getFullYear() && selMonth === now.getMonth();
  const monthPrefix = `${selYear}-${String(selMonth + 1).padStart(2, '0')}`;

  const monthTxns = transactions.filter(t => t.date.startsWith(monthPrefix));

  const filtered = monthTxns.filter(t => {
    if (tab === 1 && t.transaction_type !== 'income')  return false;
    if (tab === 2 && t.transaction_type !== 'expense') return false;
    if (search) {
      const haystack = ((t.description ?? '') + ' ' + (t.category ?? '')).toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
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
      {/* Floating add button */}
      <button
        onClick={() => setShowAddModal(true)}
        style={{ position:'fixed', bottom:90, right:20, zIndex:200,
          width:52, height:52, borderRadius:16, border:'none',
          background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
          color:'#fff', fontSize:26, fontWeight:300, cursor:'pointer',
          boxShadow:'0 4px 20px rgba(59,130,246,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
        +
      </button>

      <div style={{ background:'linear-gradient(160deg,#102040,#081426)', padding:'48px 20px 20px' }}>
        <div style={{ color:C.text, fontSize:22, fontWeight:800, marginBottom:2 }}>Movimientos</div>

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
            {isCurrent && (
              <div style={{ color:C.accent, fontSize:10, fontWeight:600, marginTop:1 }}>MES ACTUAL</div>
            )}
          </div>
          <button onClick={nextMonth}
            style={{ background: isCurrent ? 'transparent' : 'rgba(255,255,255,0.07)',
              border:'none', borderRadius:10, width:36, height:36,
              color: isCurrent ? C.border : C.text,
              fontSize:18, cursor: isCurrent ? 'default' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
            ›
          </button>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <div style={{ flex:1, background:'rgba(49,214,123,0.12)', border:'1px solid rgba(49,214,123,0.25)', borderRadius:14, padding:'10px 14px' }}>
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
            placeholder="Buscar por descripción o categoría..."
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
                    <div style={{ width:42, height:42, borderRadius:13, background:`${t.transaction_type==='income'?C.accent:C.primaryGlow}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                      {txIcon(t.description ?? '', t.transaction_type, t.category)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:C.text, fontSize:14, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.description ?? 'Movimiento'}</div>
                      <div style={{ color:C.textMuted, fontSize:11, marginTop:2 }}>{txCategory(t.description ?? '', t.transaction_type, t.category)}</div>
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

      <TransactionDetailSheet
        tx={selectedTx}
        onClose={() => setSelectedTx(null)}
        onDeleted={handleDeleted}
        onCategoryChanged={handleCategoryChanged}
      />

      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onSaved={loadTransactions}
        />
      )}
    </div>
  );
}
