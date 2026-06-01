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
  notes: string | null;
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

function txColor(t: Txn): string {
  if (t.transaction_type === 'income') return C.accent;
  return C.primaryGlow;
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

export function DashboardScreen() {
  const [transactions, setTransactions] = useState<Txn[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('transactions')
        .select('id, transaction_type, amount, description, date, notes')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(100)
        .then(({ data }) => setTransactions((data as Txn[]) ?? []));
    });
  }, []);

  const income  = transactions.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const savings = income - expense;

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ background: gradHero, padding:'48px 20px 24px', borderRadius:'0 0 28px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <div style={{ color:C.textMuted, fontSize:12, letterSpacing:1 }}>NEXO FINANZAS</div>
            <div style={{ color:C.text, fontSize:17, fontWeight:700 }}>Bienvenido 👋</div>
          </div>
        </div>

        <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:20, padding:20, border:`1px solid ${C.border}` }}>
          <div style={{ color:C.textMuted, fontSize:12, marginBottom:4 }}>Balance neto</div>
          <div style={{ color:C.text, fontSize:36, fontWeight:800, marginBottom:8 }}>{fmt(savings)}</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(34,197,94,0.15)', borderRadius:999, padding:'3px 10px' }}>
            <span style={{ color:C.accent, fontSize:12 }}>{transactions.length} movimiento{transactions.length !== 1 ? 's' : ''} importado{transactions.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {[
            { label:'Ingresos', value:income,  color:C.accent,      icon:'↓' },
            { label:'Gastos',   value:expense, color:C.danger,      icon:'↑' },
            { label:'Ahorro',   value:savings, color:C.primaryGlow, icon:'≡' },
          ].map(s => (
            <div key={s.label} style={{ ...card, textAlign:'center', padding:14 }}>
              <div style={{ color:s.color, fontSize:18, marginBottom:4 }}>{s.icon}</div>
              <div style={{ color:C.text, fontSize:14, fontWeight:700 }}>{fmt(s.value)}</div>
              <div style={{ color:C.textMuted, fontSize:10, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Spending by category */}
        <Section title="Gastos por categoría">
          {expense === 0
            ? <Empty icon="📊" text="Los gastos aparecerán aquí cuando se importen movimientos" />
            : (() => {
                const bycat: Record<string, number> = {};
                transactions.filter(t => t.transaction_type === 'expense').forEach(t => {
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
                          <div style={{ width:`${Math.round((amt/expense)*100)}%`, height:'100%', background:colors[i % colors.length], borderRadius:3 }} />
                        </div>
                        <div style={{ color:C.text, fontSize:12, fontWeight:600, minWidth:80, textAlign:'right' }}>{fmt(amt)}</div>
                      </div>
                    ))}
                  </div>
                );
              })()
          }
        </Section>

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

        <Section title="Movimientos recientes" action={transactions.length ? 'Ver todos' : undefined}>
          {transactions.length === 0
            ? <Empty icon="💸" text="Ve a Configurar y conecta Gmail para importar tus movimientos automáticamente" />
            : <div style={{ ...card }}>
                {transactions.slice(0,5).map((t, i) => (
                  <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:i<4?12:0, marginBottom:i<4?12:0, borderBottom:i<4?`1px solid ${C.border}`:'none' }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:`${txColor(t)}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{txIcon(t)}</div>
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
