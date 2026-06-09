import React, { useState, useEffect } from 'react';
import { C, fmt, card, gradHero } from '../theme';
import { GOALS } from '../mockData';
import { supabase } from '../lib/supabase';
import { TransactionDetailSheet, type TxDetail } from '../components/TransactionDetailSheet';

interface Txn {
  id: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
  notes?: string | null;
  gmail_message_id?: string | null;
}

interface MonthlySummary {
  year: number;
  month: number;
  total_income: number;
  total_expenses: number;
  net_savings: number;
}

interface Account {
  account_type: string;
  initial_balance: number | null;
  credit_limit: number | null;
  institution: string;
  account_suffix: string | null;
  name: string;
}

function txIcon(t: Txn): string {
  const d = (t.description ?? '').toLowerCase();
  if (t.transaction_type === 'income') return '💰';
  if (/éxito|carulla|jumbo|d1|ara|supermercad|alkosto/i.test(d)) return '🛒';
  if (/restaurante|comida|rappi|ifood|mcdonald|kfc/i.test(d)) return '🍽️';
  if (/gasolina|terpel|primax|biomax/i.test(d)) return '⛽';
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
  if (/restaurante|comida|rappi|ifood/i.test(d)) return 'Restaurante';
  if (/gasolina|terpel|primax|biomax/i.test(d)) return 'Gasolina';
  if (/uber|taxi|didi|cabify|sitp/i.test(d)) return 'Transporte';
  if (/netflix|spotify|disney|hbo|cine/i.test(d)) return 'Entretenimiento';
  if (/farmacia|droguería|salud|clínica/i.test(d)) return 'Salud';
  if (/arriendo|renta/i.test(d)) return 'Vivienda';
  return 'Otros';
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function firstName(email: string, meta?: Record<string, string>): string {
  const full = meta?.full_name || meta?.name || '';
  if (full) return full.split(' ')[0];
  return (email.split('@')[0] ?? '').split('.')[0].replace(/\d/g, '');
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`;
  return fmt(n);
}

function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return {
    first: `${y}-${String(m).padStart(2, '0')}-01`,
    last:  new Date(y, m, 0).toISOString().slice(0, 10),
    year: y, month: m,
  };
}

export function DashboardScreen() {
  const [currentTxns, setCurrentTxns]     = useState<Txn[]>([]);
  const [prevSummaries, setPrevSummaries] = useState<MonthlySummary[]>([]);
  const [accounts, setAccounts]           = useState<Account[]>([]);
  const [userName, setUserName]           = useState('');
  const [loading, setLoading]             = useState(true);
  const [selectedTx, setSelectedTx]       = useState<TxDetail | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setLoading(false); return; }
        const user = session.user;

        setUserName(firstName(user.email ?? '', user.user_metadata as Record<string, string>));

        const { first, last, year, month } = currentMonthRange();

        const [txnsRes, summariesRes, accountsRes] = await Promise.all([
          supabase
            .from('transactions')
            .select('id, transaction_type, amount, description, date, notes, gmail_message_id')
            .eq('user_id', user.id)
            .gte('date', first)
            .lte('date', last)
            .order('date', { ascending: false }),

          supabase
            .from('monthly_summaries')
            .select('year, month, total_income, total_expenses, net_savings')
            .eq('user_id', user.id)
            .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`)
            .order('year', { ascending: false })
            .order('month', { ascending: false }),

          supabase
            .from('accounts')
            .select('account_type, initial_balance, credit_limit, institution, account_suffix, name')
            .eq('user_id', user.id)
            .eq('is_active', true),
        ]);

        setCurrentTxns((txnsRes.data as Txn[]) ?? []);
        setPrevSummaries((summariesRes.data as MonthlySummary[]) ?? []);
        setAccounts((accountsRes.data as Account[]) ?? []);
      } catch (e) {
        console.error('DashboardScreen load:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const debitAccounts  = accounts.filter(a => a.account_type !== 'credit_card');
  const creditAccounts = accounts.filter(a => a.account_type === 'credit_card');
  const debitBase  = debitAccounts.reduce((s, a) => s + Number(a.initial_balance ?? 0), 0);
  const creditDebt = creditAccounts.reduce((s, a) => s + Number(a.initial_balance ?? 0), 0);

  const prevNet    = prevSummaries.reduce((s, m) => s + (Number(m.total_income) - Number(m.total_expenses)), 0);
  const curIncome  = currentTxns.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const curExpense = currentTxns.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const curNet     = curIncome - curExpense;
  const totalAssets = debitBase + prevNet + curNet;
  const netWorth    = totalAssets - creditDebt;

  const hasCC       = creditAccounts.length > 0;
  const totalDebt   = creditDebt;
  const maxUtil     = creditAccounts.length > 0
    ? Math.max(...creditAccounts.map(a => {
        const d = Number(a.initial_balance ?? 0);
        const l = Number(a.credit_limit ?? 0);
        return l > 0 ? Math.round((d / l) * 100) : 0;
      }))
    : 0;

  return (
    <div style={{ paddingBottom: 100 }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ background: gradHero, padding:'48px 20px 20px' }}>

        {/* Greeting row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <div style={{ color:C.textMuted, fontSize:12, marginBottom:2 }}>
              {greeting()}{userName ? `, ${userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase()}` : ''}
            </div>
            <div style={{ color:C.text, fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>Mi Finanzas</div>
          </div>
          <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:10, padding:'5px 12px' }}>
            <div style={{ color:C.textMuted, fontSize:11, textTransform:'capitalize' }}>
              {new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Patrimonio neto banner */}
        <div style={{
          background:'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(59,130,246,0.06))',
          border:'1px solid rgba(59,130,246,0.3)', borderRadius:18, padding:'16px 18px', marginBottom:14,
        }}>
          <div style={{ color:'rgba(148,163,184,0.9)', fontSize:10, fontWeight:700, letterSpacing:1, marginBottom:6 }}>
            {hasCC ? 'PATRIMONIO NETO' : 'BALANCE TOTAL'}
          </div>
          <div style={{ color: netWorth >= 0 ? '#e2e8f0' : C.danger, fontSize:34, fontWeight:800, letterSpacing:-1.5, marginBottom: hasCC ? 12 : 0 }}>
            {fmt(netWorth)}
          </div>
          {hasCC && (
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <div>
                <div style={{ color:'rgba(148,163,184,0.7)', fontSize:10, marginBottom:2 }}>Activos</div>
                <div style={{ color:C.accent, fontSize:15, fontWeight:700 }}>{fmt(totalAssets)}</div>
              </div>
              <div style={{ color:'rgba(148,163,184,0.3)', fontSize:18, fontWeight:300 }}>−</div>
              <div>
                <div style={{ color:'rgba(148,163,184,0.7)', fontSize:10, marginBottom:2 }}>Deuda TC</div>
                <div style={{ color:C.danger, fontSize:15, fontWeight:700 }}>{fmt(totalDebt)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Account chips */}
        {accounts.length > 0 && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {debitAccounts.map((a, i) => (
              <div key={i} style={{
                display:'inline-flex', alignItems:'center', gap:5,
                background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.25)',
                borderRadius:20, padding:'5px 11px',
              }}>
                <span style={{ fontSize:12 }}>🏦</span>
                <span style={{ color:'#3b82f6', fontSize:11, fontWeight:600 }}>
                  {a.institution.split(' ')[0]} {fmtShort(Number(a.initial_balance ?? 0))}
                </span>
              </div>
            ))}
            {creditAccounts.map((a, i) => (
              <div key={i} style={{
                display:'inline-flex', alignItems:'center', gap:5,
                background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)',
                borderRadius:20, padding:'5px 11px',
              }}>
                <span style={{ fontSize:12 }}>💳</span>
                <span style={{ color:C.danger, fontSize:11, fontWeight:600 }}>
                  TC -{fmtShort(Number(a.initial_balance ?? 0))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────── */}
      <div style={{ padding:'16px 16px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* Month summary */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { label:'Ingresos del mes', value:curIncome,  color:C.accent },
            { label:'Gastos del mes',   value:curExpense, color:C.danger },
          ].map(s => (
            <div key={s.label} style={{ ...card, textAlign:'center', padding:14 }}>
              <div style={{ color:s.color, fontSize:20, fontWeight:800 }}>{fmt(s.value)}</div>
              <div style={{ color:C.textMuted, fontSize:10, marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Credit utilization — styled like mockup */}
        {creditAccounts.length > 0 && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ color:'#F8FAFC', fontSize:16, fontWeight:700 }}>Uso de tarjetas</div>
              {maxUtil > 0 && (
                <span style={{
                  background: maxUtil >= 80 ? 'rgba(239,68,68,0.2)' : maxUtil >= 50 ? 'rgba(245,158,11,0.2)' : 'rgba(49,214,123,0.15)',
                  border: `1px solid ${maxUtil >= 80 ? 'rgba(239,68,68,0.4)' : maxUtil >= 50 ? 'rgba(245,158,11,0.4)' : 'rgba(49,214,123,0.3)'}`,
                  borderRadius:20, padding:'3px 10px', fontSize:10, fontWeight:700,
                  color: maxUtil >= 80 ? C.danger : maxUtil >= 50 ? '#f59e0b' : C.accent,
                }}>
                  {maxUtil}% utilizado
                </span>
              )}
            </div>
            <div style={{ ...card }}>
              {creditAccounts.map((a, i) => {
                const debt  = Number(a.initial_balance ?? 0);
                const limit = Number(a.credit_limit ?? 0);
                const pct   = limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : null;
                const col   = pct == null ? C.textMuted : pct >= 80 ? C.danger : pct >= 50 ? '#f59e0b' : C.accent;
                return (
                  <div key={i} style={{
                    paddingTop: i > 0 ? 14 : 0,
                    marginTop:  i > 0 ? 14 : 0,
                    borderTop:  i > 0 ? `1px solid ${C.border}` : 'none',
                  }}>
                    <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, marginBottom:5 }}>
                      {a.institution} ****{a.account_suffix}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                      <span style={{ color:col, fontWeight:700 }}>{fmt(debt)} usado</span>
                      <span style={{ color:C.textMuted }}>Cupo: {limit > 0 ? fmt(limit) : '—'}</span>
                    </div>
                    {pct != null ? (
                      <div style={{ height:6, background:C.border, borderRadius:99, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:99 }} />
                      </div>
                    ) : (
                      <div style={{ color:C.textMuted, fontSize:10 }}>Registra el cupo en Configuración para ver la utilización</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Previous month closings */}
        {prevSummaries.length > 0 && (
          <Section title="Cierres anteriores">
            <div style={{ ...card }}>
              {prevSummaries.slice(0, 4).map((s, i) => {
                const net = Number(s.total_income) - Number(s.total_expenses);
                const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                const isLast = i >= Math.min(prevSummaries.length, 4) - 1;
                return (
                  <div key={`${s.year}-${s.month}`} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    paddingBottom: isLast ? 0 : 10, marginBottom: isLast ? 0 : 10,
                    borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10,
                        background: net >= 0 ? 'rgba(49,214,123,0.15)' : 'rgba(239,68,68,0.15)',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                        {net >= 0 ? '📈' : '📉'}
                      </div>
                      <div>
                        <div style={{ color:C.text, fontSize:13, fontWeight:600 }}>{MONTHS[s.month - 1]} {s.year}</div>
                        <div style={{ color:C.textMuted, fontSize:10 }}>↑{fmt(Number(s.total_income))} · ↓{fmt(Number(s.total_expenses))}</div>
                      </div>
                    </div>
                    <div style={{ color: net >= 0 ? C.accent : C.danger, fontSize:13, fontWeight:700 }}>
                      {net >= 0 ? '+' : ''}{fmt(net)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Spending by category */}
        <Section title="Flujo por categoría">
          {curExpense === 0
            ? <Empty icon="📊" text="Los gastos del mes aparecerán aquí automáticamente" />
            : (() => {
                const bycat: Record<string, number> = {};
                currentTxns.filter(t => t.transaction_type === 'expense').forEach(t => {
                  const cat = txCategory(t);
                  bycat[cat] = (bycat[cat] ?? 0) + Number(t.amount);
                });
                const colors = C.chart;
                return (
                  <div style={{ ...card }}>
                    {Object.entries(bycat).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name, amt], i) => (
                      <div key={name} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:i<4?12:0 }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:colors[i % colors.length], flexShrink:0 }} />
                        <div style={{ flex:1, fontSize:13, color:C.textSec }}>{name}</div>
                        <div style={{ flex:2, height:6, background:C.border, borderRadius:3, overflow:'hidden' }}>
                          <div style={{ width:`${Math.round((amt/curExpense)*100)}%`, height:'100%', background:colors[i % colors.length], borderRadius:3 }} />
                        </div>
                        <div style={{ color:C.text, fontSize:12, fontWeight:600, minWidth:80, textAlign:'right' }}>{fmt(amt)}</div>
                      </div>
                    ))}
                  </div>
                );
              })()
          }
        </Section>

        {/* Goals */}
        <Section title="Metas activas" action={GOALS.length ? 'Ver todas' : undefined}>
          {GOALS.length === 0
            ? <Empty icon="🎯" text="Crea tu primera meta financiera en la sección Metas" />
            : GOALS.slice(0,2).map((g: any) => {
                const pct = Math.round((g.saved/g.target)*100);
                return (
                  <div key={g.id} style={{ ...card, marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                      <div style={{ width:42, height:42, borderRadius:12, background:`${g.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{g.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ color:C.text, fontSize:14, fontWeight:600 }}>{g.name}</div>
                        <div style={{ color:C.textMuted, fontSize:11 }}>Meta: {fmt(g.target)}</div>
                      </div>
                      <div style={{ color:g.color, fontSize:16, fontWeight:800 }}>{pct}%</div>
                    </div>
                    <div style={{ height:6, background:C.border, borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:g.color, borderRadius:3 }} />
                    </div>
                  </div>
                );
              })
          }
        </Section>

        {/* Recent transactions */}
        <Section title="Movimientos recientes">
          {loading
            ? <Empty icon="⏳" text="Cargando…" />
            : currentTxns.length === 0
              ? <Empty icon="💸" text="Ve a Configurar y conecta Gmail para importar movimientos" />
              : <div style={{ ...card }}>
                  {currentTxns.slice(0,5).map((t, i) => (
                    <div key={t.id}
                      onClick={() => setSelectedTx(t)}
                      style={{ display:'flex', alignItems:'center', gap:12,
                        paddingBottom:i<4?12:0, marginBottom:i<4?12:0,
                        borderBottom:i<4?`1px solid ${C.border}`:'none', cursor:'pointer' }}>
                      <div style={{ width:40, height:40, borderRadius:12,
                        background:`${t.transaction_type==='income'?C.accent:C.primaryGlow}22`,
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                        {txIcon(t)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ color:C.text, fontSize:14, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.description ?? 'Movimiento'}</div>
                        <div style={{ color:C.textMuted, fontSize:11 }}>{txCategory(t)} · {t.date.slice(5)}</div>
                      </div>
                      <div style={{ color:t.transaction_type==='income'?C.accent:C.text, fontSize:14, fontWeight:700, flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                        {t.transaction_type==='income'?'+':'-'}{fmt(Number(t.amount))}
                        <span style={{ color:C.border, fontSize:14 }}>›</span>
                      </div>
                    </div>
                  ))}
                </div>
          }
        </Section>
      </div>

      <TransactionDetailSheet tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </div>
  );
}

function Section({ title, action, children }: { title:string; action?:string; children:React.ReactNode }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ color:'#F8FAFC', fontSize:16, fontWeight:700 }}>{title}</div>
        {action && <span style={{ color:C.accent, fontSize:13 }}>{action}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ icon, text }: { icon:string; text:string }) {
  return (
    <div style={{ ...card, textAlign:'center', padding:'28px 20px' }}>
      <div style={{ fontSize:32, marginBottom:10 }}>{icon}</div>
      <div style={{ color:C.textMuted, fontSize:13, lineHeight:1.6 }}>{text}</div>
    </div>
  );
}
