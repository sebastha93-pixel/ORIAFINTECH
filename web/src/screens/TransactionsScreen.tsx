import React, { useState, useEffect, useCallback } from 'react';
import { C, fmt, card } from '../theme';
import { supabase } from '../lib/supabase';
import { TransactionDetailSheet, txIcon, type TxDetail } from '../components/TransactionDetailSheet';
import { downloadMonthlyReport } from '../lib/reportExcel';
import { groupByCategory, buildInsights, categorize, type Insight } from '../lib/insights';
import type { Txn } from '../lib/finance';

// 💳 MOVIMIENTOS — ¿Qué está pasando con mi dinero?
// Resumen del mes → Insights IA → grupos inteligentes por categoría.

const TABS = ['Todos', 'Ingresos', 'Gastos'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const VIRTUAL_ID_PREFIX = '__saldo_';

function formatMonthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month]} ${year}`;
}

function monthPrefixOf(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function TransactionsScreen({ reloadKey }: { reloadKey?: number }) {
  const now = new Date();
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [accounts, setAccounts]         = useState<{ id: string; name: string; account_type: string; initial_balance: number | null; initial_balance_set_at: string | null }[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [tab, setTab]                   = useState(0);
  const [search, setSearch]             = useState('');
  const [selYear, setSelYear]           = useState(now.getFullYear());
  const [selMonth, setSelMonth]         = useState(now.getMonth());
  const [selectedTx, setSelectedTx]     = useState<TxDetail | null>(null);
  const [openGroups, setOpenGroups]     = useState<Set<string>>(new Set());
  const [viewMode, setViewMode]         = useState<'category' | 'date'>('category');

  const loadTransactions = useCallback(async () => {
    setLoadError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const FULL = 'id, transaction_type, amount, description, date, notes, gmail_message_id, category, metadata';
      const BASE = 'id, transaction_type, amount, description, date, notes, gmail_message_id';

      const q = (cols: string) => supabase.from('transactions')
        .select(cols)
        .eq('user_id', session.user.id)
        .gte('date', `${new Date().getFullYear() - 2}-01-01`) // limit to last 2 years
        .order('date', { ascending: false });

      const [full, acctRes] = await Promise.all([
        q(FULL),
        supabase.from('accounts')
          .select('id, name, account_type, initial_balance, initial_balance_set_at')
          .eq('user_id', session.user.id)
          .eq('is_active', true),
      ]);

      let txnData: unknown[] | null = full.data;
      if (full.error) {
        const base = await q(BASE);
        if (base.error) throw base.error;
        txnData = base.data;
      }
      setTransactions((txnData as Txn[]) ?? []);

      if (acctRes.error) {
        console.error('accounts fetch error:', acctRes.error.message);
      }
      setAccounts(acctRes.data ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('loadTransactions:', e);
      setLoadError(msg.slice(0, 200));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTransactions(); }, [loadTransactions, reloadKey]);

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

  function handleNotesChanged(id: string, notes: string) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, notes } : t));
    setSelectedTx(prev => prev && prev.id === id ? { ...prev, notes } : prev);
  }

  function toggleGroup(name: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  const isCurrent   = selYear === now.getFullYear() && selMonth === now.getMonth();
  const monthPrefix = monthPrefixOf(selYear, selMonth);
  const prevDate    = new Date(selYear, selMonth - 1, 1);
  const prevPrefix  = monthPrefixOf(prevDate.getFullYear(), prevDate.getMonth());

  // Virtual "Saldo inicial" income entries: one per debit account created this viewed month
  const virtualSaldos: Txn[] = accounts
    .filter(a => a.account_type !== 'credit_card' && (a.initial_balance ?? 0) > 0 && a.initial_balance_set_at?.startsWith(monthPrefix))
    .map(a => ({
      id: `${VIRTUAL_ID_PREFIX}${a.id}`,
      transaction_type: 'income' as const,
      amount: a.initial_balance!,
      description: `Saldo inicial · ${a.name}`,
      date: a.initial_balance_set_at!.slice(0, 10),
      notes: 'Saldo inicial',
      gmail_message_id: null,
      category: 'Saldo inicial',
    }));

  const monthTxns     = [...transactions.filter(t => t.date.startsWith(monthPrefix)), ...virtualSaldos];
  const prevMonthTxns = transactions.filter(t => t.date.startsWith(prevPrefix));

  const filtered = monthTxns.filter(t => {
    if (tab === 1 && t.transaction_type !== 'income')  return false;
    if (tab === 2 && t.transaction_type !== 'expense') return false;
    if (search) {
      const hay = ((t.description ?? '') + ' ' + (t.category ?? '') + ' ' + categorize(t).name).toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const totalIncome  = monthTxns.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = monthTxns.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const savings      = totalIncome - totalExpense;

  const insights: Insight[] = buildInsights(monthTxns, prevMonthTxns, fmt);
  const groups = groupByCategory(filtered);

  const byDate: Record<string, Txn[]> = {};
  filtered.forEach(t => { (byDate[t.date] ??= []).push(t); });

  return (
    <div style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

      {/* ── HEADER: resumen del mes ── */}
      <div style={{ background: 'linear-gradient(160deg,#102040,#081426)', padding: '48px 20px 20px' }}>
        <div style={{ color: C.text, fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Movimientos</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 16 }}>
          <button onClick={prevMonth}
            style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 10, width: 36, height: 36,
              color: C.text, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ‹
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.text, fontSize: 15, fontWeight: 700, textTransform: 'capitalize' }}>
              {formatMonthLabel(selYear, selMonth)}
            </div>
            {isCurrent && (
              <div style={{ color: C.accent, fontSize: 10, fontWeight: 600, marginTop: 1 }}>MES ACTUAL</div>
            )}
          </div>
          <button onClick={nextMonth}
            style={{ background: isCurrent ? 'transparent' : 'rgba(255,255,255,0.07)',
              border: 'none', borderRadius: 10, width: 36, height: 36,
              color: isCurrent ? C.border : C.text,
              fontSize: 18, cursor: isCurrent ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ›
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <SummaryCell label="Ingresos" value={fmt(totalIncome)} color={C.accent}     bg="rgba(49,214,123" />
          <SummaryCell label="Gastos"   value={fmt(totalExpense)} color={C.danger}    bg="rgba(239,68,68" />
          <SummaryCell label="Ahorro"   value={fmt(savings)} color={savings >= 0 ? C.primaryGlow : C.danger} bg="rgba(59,130,246" />
        </div>

        {monthTxns.length > 0 && (
          <button
            onClick={() => downloadMonthlyReport(monthTxns, selYear, selMonth)}
            style={{ marginTop: 14, width: '100%', padding: '10px 0', borderRadius: 12,
              border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.1)',
              color: C.primaryGlow, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            📥 Descargar informe Excel
          </button>
        )}
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* ── INSIGHTS IA ── */}
        {insights.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14,
                background: ins.tone === 'good' ? 'rgba(49,214,123,0.08)' : ins.tone === 'bad' ? 'rgba(239,68,68,0.07)' : 'rgba(59,130,246,0.07)',
                border: `1px solid ${ins.tone === 'good' ? 'rgba(49,214,123,0.2)' : ins.tone === 'bad' ? 'rgba(239,68,68,0.18)' : 'rgba(59,130,246,0.18)'}`,
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{ins.emoji}</span>
                <span style={{ color: C.textSec, fontSize: 12.5, lineHeight: 1.45 }}>{ins.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 14px', height: 44, marginBottom: 14 }}>
          <span style={{ color: C.textMuted, marginRight: 8, fontSize: 15 }}>🔍</span>
          <input
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 14 }}
            placeholder="Buscar por descripción o categoría..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs + view toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, display: 'flex', background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 4, gap: 4 }}>
            {TABS.map((t, i) => (
              <button key={t} onClick={() => setTab(i)} style={{
                flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tab === i ? C.accent : 'transparent',
                color: tab === i ? '#fff' : C.textMuted,
              }}>{t}</button>
            ))}
          </div>
          <button
            onClick={() => setViewMode(v => v === 'category' ? 'date' : 'category')}
            title={viewMode === 'category' ? 'Ver por fecha' : 'Ver por categoría'}
            style={{ width: 48, borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface,
              color: C.textSec, fontSize: 16, cursor: 'pointer' }}>
            {viewMode === 'category' ? '📅' : '🏷️'}
          </button>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}>
            <div style={{ fontSize: 14 }}>Cargando movimientos…</div>
          </div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#EF4444' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Error al cargar movimientos</div>
            <div style={{ fontSize: 11, color: '#94A3B8', background: '#0F172A', padding: '10px 14px',
              borderRadius: 10, textAlign: 'center', maxWidth: 340, margin: '0 auto' }}>
              Intenta cerrar y abrir la app. Si el error persiste, contacta soporte.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💸</div>
            <div style={{ fontSize: 14 }}>
              {monthTxns.length === 0
                ? 'Toca ＋ para agregar tu primer movimiento'
                : `Sin movimientos en ${formatMonthLabel(selYear, selMonth).toLowerCase()}`}
            </div>
          </div>
        ) : viewMode === 'category' ? (
          /* ── GRUPOS POR CATEGORÍA ── */
          groups.map(g => {
            const open = openGroups.has(g.name);
            const isIncomeGroup = g.txns.every(t => t.transaction_type === 'income');
            return (
              <div key={g.name} style={{ ...card, padding: 0, marginBottom: 12, overflow: 'hidden' }}>
                <div
                  onClick={() => toggleGroup(g.name)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12,
                    background: `${isIncomeGroup ? C.accent : C.primaryGlow}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
                    {g.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{g.name}</div>
                    <div style={{ color: C.textMuted, fontSize: 11, marginTop: 1 }}>
                      {g.txns.length} movimiento{g.txns.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: isIncomeGroup ? C.accent : C.text, fontSize: 14, fontWeight: 800 }}>
                      {isIncomeGroup ? '+' : '-'}{fmt(g.total)}
                    </div>
                  </div>
                  <span style={{ color: C.border, fontSize: 13 }}>{open ? '▴' : '▾'}</span>
                </div>

                {open && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: '4px 16px 8px' }}>
                    {g.txns.map(t => (
                      <TxRow key={t.id} t={t}
                        onClick={t.id.startsWith(VIRTUAL_ID_PREFIX) ? undefined : () => setSelectedTx(t)}
                        showDate />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* ── VISTA POR FECHA (clásica) ── */
          Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, txns]) => (
            <div key={date} style={{ marginBottom: 20 }}>
              <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
                {new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long' })}
              </div>
              <div style={{ ...card, paddingTop: 4, paddingBottom: 8 }}>
                {txns.map(t => (
                  <TxRow key={t.id} t={t}
                    onClick={t.id.startsWith(VIRTUAL_ID_PREFIX) ? undefined : () => setSelectedTx(t)} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <TransactionDetailSheet
        tx={selectedTx}
        onClose={() => setSelectedTx(null)}
        onCategoryChanged={handleCategoryChanged}
        onNotesChanged={handleNotesChanged}
      />
    </div>
  );
}

function TxRow({ t, onClick, showDate }: { t: Txn; onClick?: () => void; showDate?: boolean }) {
  const isVirtual = t.id.startsWith(VIRTUAL_ID_PREFIX);
  return (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
        borderBottom: `1px solid ${C.border}`, cursor: onClick ? 'pointer' : 'default',
        opacity: isVirtual ? 0.85 : 1 }}>
      <div style={{ width: 36, height: 36, borderRadius: 11,
        background: isVirtual ? 'rgba(49,214,123,0.12)' : `${t.transaction_type === 'income' ? C.accent : C.primaryGlow}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
        {isVirtual ? '🏦' : txIcon(t.description ?? '', t.transaction_type, t.category)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.description ?? 'Movimiento'}
        </div>
        {showDate && (
          <div style={{ color: C.textMuted, fontSize: 10.5, marginTop: 1 }}>
            {new Date(t.date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ color: t.transaction_type === 'income' ? C.accent : C.text, fontSize: 13, fontWeight: 700 }}>
          {t.transaction_type === 'income' ? '+' : '-'}{fmt(Number(t.amount))}
        </span>
        {!isVirtual && <span style={{ color: C.border, fontSize: 14 }}>›</span>}
      </div>
    </div>
  );
}

function SummaryCell({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{ flex: 1, background: `${bg},0.12)`, border: `1px solid ${bg},0.25)`, borderRadius: 14, padding: '10px 12px' }}>
      <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 2 }}>{label}</div>
      <div style={{ color, fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  );
}
