import React from 'react';
import { C, fmt, card, gradAccent, gradBlue, gradHero } from '../theme';
import { ACCOUNTS, TRANSACTIONS, GOALS, SPENDING } from '../mockData';

export function DashboardScreen() {
  const netWorth = 15950000;
  const income   = 6600000;
  const expense  = 2839900;
  const savings  = income - expense;

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Hero Header */}
      <div style={{ background: gradHero, padding:'48px 20px 24px', borderRadius:'0 0 28px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <div style={{ color:C.textMuted, fontSize:12, letterSpacing:1 }}>NEXO FINANZAS</div>
            <div style={{ color:C.text, fontSize:17, fontWeight:700 }}>Buenos días, Sebastián 👋</div>
          </div>
          <div style={{ position:'relative' }}>
            <div style={{ width:40, height:40, borderRadius:12, background:C.surface, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🔔</div>
            <div style={{ position:'absolute', top:6, right:6, width:8, height:8, borderRadius:'50%', background:C.accent, border:`2px solid ${C.bg}` }} />
          </div>
        </div>

        {/* Net Worth Card */}
        <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:20, padding:20, border:`1px solid ${C.border}` }}>
          <div style={{ color:C.textMuted, fontSize:12, marginBottom:4 }}>Patrimonio Neto</div>
          <div style={{ color:C.text, fontSize:36, fontWeight:800, marginBottom:8 }}>{fmt(netWorth)}</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(34,197,94,0.15)', borderRadius:999, padding:'3px 10px' }}>
            <span style={{ color:C.accent, fontSize:12 }}>↑ +2.4% este mes</span>
          </div>
        </div>
      </div>

      <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:20 }}>
        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {[
            { label:'Ingresos', value:income, color:C.accent, icon:'↓' },
            { label:'Gastos', value:expense, color:C.danger, icon:'↑' },
            { label:'Ahorro', value:savings, color:C.primaryGlow, icon:'≡' },
          ].map(s => (
            <div key={s.label} style={{ ...card, textAlign:'center', padding:14 }}>
              <div style={{ color:s.color, fontSize:18, marginBottom:4 }}>{s.icon}</div>
              <div style={{ color:C.text, fontSize:14, fontWeight:700 }}>{fmt(s.value)}</div>
              <div style={{ color:C.textMuted, fontSize:10, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Accounts */}
        <Section title="Mis Cuentas" action="Ver todas">
          <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:4 }}>
            {ACCOUNTS.map(a => (
              <div key={a.id} style={{ minWidth:160, background:`linear-gradient(135deg,${a.color}22,${a.color}11)`, border:`1px solid ${a.color}33`, borderRadius:18, padding:16, flexShrink:0 }}>
                <div style={{ color:a.color, fontSize:22, marginBottom:8 }}>{a.type==='checking'?'🏦':a.type==='savings'?'💰':'💳'}</div>
                <div style={{ color:C.text, fontSize:14, fontWeight:600 }}>{a.name}</div>
                <div style={{ color:C.textMuted, fontSize:11, marginBottom:8 }}>{a.institution}</div>
                <div style={{ color:C.text, fontSize:16, fontWeight:700 }}>{fmt(a.balance)}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Spending donut */}
        <Section title="Gastos por categoría" action="Ver detalle">
          <div style={{ ...card }}>
            {SPENDING.map((s, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:i<SPENDING.length-1?12:0 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:s.color, flexShrink:0 }} />
                <div style={{ flex:1, fontSize:13, color:C.textSec }}>{s.name}</div>
                <div style={{ flex:2, height:6, background:C.border, borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${s.pct}%`, height:'100%', background:s.color, borderRadius:3 }} />
                </div>
                <div style={{ color:C.text, fontSize:12, fontWeight:600, minWidth:70, textAlign:'right' }}>{fmt(s.amount)}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Goals */}
        <Section title="Metas activas" action="Ver todas">
          {GOALS.slice(0,2).map(g => {
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
                  <div style={{ width:`${pct}%`, height:'100%', background:g.color, borderRadius:3, transition:'width 0.6s ease' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
                  <span style={{ color:g.color, fontSize:12, fontWeight:700 }}>{fmt(g.saved)} ahorrado</span>
                  <span style={{ color:C.textMuted, fontSize:11 }}>Faltan {fmt(g.target-g.saved)}</span>
                </div>
              </div>
            );
          })}
        </Section>

        {/* Recent transactions */}
        <Section title="Movimientos recientes" action="Ver todos">
          <div style={{ ...card }}>
            {TRANSACTIONS.slice(0,5).map((t,i) => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:i<4?12:0, marginBottom:i<4?12:0, borderBottom:i<4?`1px solid ${C.border}`:'none' }}>
                <div style={{ width:40, height:40, borderRadius:12, background:`${t.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{t.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text, fontSize:14, fontWeight:500 }}>{t.desc}</div>
                  <div style={{ color:C.textMuted, fontSize:11 }}>{t.category} · {t.date.slice(5)}</div>
                </div>
                <div style={{ color:t.type==='income'?C.accent:C.text, fontSize:14, fontWeight:700 }}>
                  {t.type==='income'?'+':'-'}{fmt(t.amount)}
                </div>
              </div>
            ))}
          </div>
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
        {action && <span style={{ color:'#22C55E', fontSize:13, cursor:'pointer' }}>{action}</span>}
      </div>
      {children}
    </div>
  );
}
