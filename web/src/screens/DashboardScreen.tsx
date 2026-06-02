import React, { useState, useEffect } from 'react';
import { C, fmt, card, gradHero } from '../theme';
import { GOALS } from '../mockData';
import { supabase } from '../lib/supabase';

interface Txn {
  id: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
}

interface MonthlySummary {
  year: number;
  month: number;
  total_income: number;
  total_expenses: number;
  net_savings: number;
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
  const [currentTxns, setCurrentTxns]   = useState<Txn[]>([]);
  const [prevSummaries, setPrevSummaries] = useState<MonthlySummary[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      const { first, last, year, month } = currentMonthRange();

      const [txnsRes, summariesRes] = await Promise.all([
        // Current month transactions
        supabase
          .from('transactions')
          .select('id, transaction_type, amount, description, date')
          .eq('user_id', user.id)
          .gte('date', first)
          .lte('date', last)
          .order('date', { ascending: false }),

        // All closed months before current month
        supabase
          .from('monthly_summaries')
          .select('year, month, total_income, total_expenses, net_savings')
          .eq('user_id', user.id)
          .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`)
          .order('year', { ascending: false })
          .order('month', { ascending: false }),
      ]);

      setCurrentTxns((txnsRes.data as Txn[]) ?? []);
      setPrevSummaries((summariesRes.data as MonthlySummary[]) ?? []);
      setLoading(false);
    });
  }, []);

  const prevNet    = prevSummaries.reduce((s, m) => s + Number(m.net_savings), 0);
  const curIncome  = currentTxns.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const curExpense = currentTxns.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const curNet     = curIncome - curExpense;
  const totalBalance = prevNet + curNet;

  const now      = new Date();
  const monthStr = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ background: gradHero, padding:'48px 20px 24px', borderRadius:'0 0 28px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ color:C.textMuted, fontSize:12, letterSpacing:1 }}>NEXO FINANZAS</div>
            <div style={{ color:C.text, fontSize:17, fontWeight:700 }}>Bienvenido 👋</div>
          </div>
          <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:10, padding:'5px 12px' }}>
            <div style={{ color:C.textMuted, fontSize:11, textTransform:'capitalize' }}>{monthStr}</div>
          </div>
        </div>

        {/* Total balance card */}
        <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:20, padding:20, border:`1px solid ${C.border}` }}>
          <div style={{ color:C.textMuted, fontSize:11, marginBottom:4, letterSpacing:0.5 }}>SALDO DISPONIBLE</div>
          <div style={{ color: totalBalance >= 0 ? C.text : C.danger, fontSize:36, fontWeight:800, marginBottom:12 }}>
            {fmt(totalBalance)}
          </div>

          {/* Breakdown row */}
          <div style={{ display:'flex', gap:0, borderTop:`1px solid ${C.border}`, paddingTop:12 }}>
            <div style={{ flex:1, paddingRight:12, borderRight:`1px solid ${C.border}` }}>
              <div style={{ color:C.textMuted, fontSize:10, marginBottom:3 }}>Saldo anterior</div>
              <div style={{ color: prevNet >= 0 ? C.accent : C.danger, fontSize:13, fontWeight:700 }}>
                {prevNet >= 0 ? '+' : ''}{fmt(prevNet)}
              </div>
              <div style={{ color:C.textMuted, fontSize:9, marginTop:1 }}>
                {prevSummaries.length} mes{prevSummaries.length !== 1 ? 'es' : ''} cerrado{prevSummaries.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ flex:1, paddingLeft:12 }}>
              <div style={{ color:C.textMuted, fontSize:10, marginBottom:3 }}>Este mes</div>
              <div style={{ color: curNet >= 0 ? C.accent : C.danger, fontSize:13, fontWeight:700 }}>
                {curNet >= 0 ? '+' : ''}{fmt(curNet)}
              </div>
              <div style={{ color:C.textMuted, fontSize:9, marginTop:1 }}>
                {currentTxns.length} movimiento{currentTxns.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* Current month summary */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { label:'Ingresos del mes',  value:curIncome,  color:C.accent  },
            { label:'Gastos del mes',    value:curExpense, color:C.danger  },
          ].map(s => (
            <div key={s.label} style={{ ...card, textAlign:'center', padding:14 }}>
              <div style={{ color:s.color, fontSize:20, fontWeight:800 }}>{fmt(s.value)}</div>
              <div style={{ color:C.textMuted, fontSize:10, marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Previous months closings */}
        {prevSummaries.length > 0 && (
          <Section title="Cierres anteriores">
            <div style={{ ...card }}>
              {prevSummaries.slice(0, 4).map((s, i) => {
                const net = Number(s.net_savings);
                const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                return (
                  <div key={`${s.year}-${s.month}`} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    paddingBottom: i < Math.min(prevSummaries.length,4)-1 ? 10 : 0,
                    marginBottom:  i < Math.min(prevSummaries.length,4)-1 ? 10 : 0,
                    borderBottom:  i < Math.min(prevSummaries.length,4)-1 ? `1px solid ${C.border}` : 'none',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10,
                        background: net >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                        {net >= 0 ? '📈' : '📉'}
                      </div>
                      <div>
                        <div style={{ color:C.text, fontSize:13, fontWeight:600 }}>
                          {MONTHS[s.month - 1]} {s.year}
                        </div>
                        <div style={{ color:C.textMuted, fontSize:10 }}>
                          ↓{fmt(Number(s.total_income))} · ↑{fmt(Number(s.total_expenses))}
                        </div>
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

        {/* Spending by category (current month) */}
        <Section title="Gastos por categoría">
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
                    <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:i<4?12:0, marginBottom:i<4?12:0, borderBottom:i<4?`1px solid ${C.border}`:'none' }}>
                      <div style={{ width:40, height:40, borderRadius:12,
                        background:`${t.transaction_type==='income'?C.accent:C.primaryGlow}22`,
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                        {txIcon(t)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ color:C.text, fontSize:14, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.description ?? 'Movimiento'}</div>
                        <div style={{ color:C.textMuted, fontSize:11 }}>{txCategory(t)} · {t.date.slice(5)}</div>
                      </div>
                      <div style={{ color:t.transaction_type==='income'?C.accent:C.text, fontSize:14, fontWeight:700, flexShrink:0 }}>
                        {t.transaction_type==='income'?'+':'-'}{fmt(Number(t.amount))}
                      </div>
                    </div>
                  ))}
                </div>
          }
        </Section>
      </div>
    </div>
  );
}

function Section({ title, action, children }: { title:string; action?:string; children:React.ReactNode }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ color:'#F8FAFC', fontSize:16, fontWeight:700 }}>{title}</div>
        {action && <span style={{ color:'#22C55E', fontSize:13 }}>{action}</span>}
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
