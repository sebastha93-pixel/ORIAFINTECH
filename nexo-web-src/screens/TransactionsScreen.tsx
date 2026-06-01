import React, { useState } from 'react';
import { C, fmt, card } from '../theme';
import { TRANSACTIONS } from '../mockData';

const TABS = ['Todos','Ingresos','Gastos'];

export function TransactionsScreen() {
  const [tab, setTab]     = useState(0);
  const [search, setSearch] = useState('');

  const filtered = TRANSACTIONS.filter(t => {
    if (tab === 1 && t.type !== 'income')  return false;
    if (tab === 2 && t.type !== 'expense') return false;
    if (search && !t.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped: Record<string, typeof TRANSACTIONS> = {};
  filtered.forEach(t => {
    const key = t.date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  const totalIncome  = TRANSACTIONS.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const totalExpense = TRANSACTIONS.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0F2563,#070B14)', padding:'48px 20px 20px' }}>
        <div style={{ color:C.text, fontSize:22, fontWeight:800, marginBottom:4 }}>Movimientos</div>
        <div style={{ color:C.textMuted, fontSize:13 }}>Historial completo</div>

        {/* Summary pills */}
        <div style={{ display:'flex', gap:10, marginTop:16 }}>
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
            <div style={{ color:C.primaryGlow, fontSize:15, fontWeight:700 }}>{fmt(totalIncome-totalExpense)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        {/* Search */}
        <div style={{ display:'flex', alignItems:'center', background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:'0 14px', height:44, marginBottom:14 }}>
          <span style={{ color:C.textMuted, marginRight:8, fontSize:15 }}>🔍</span>
          <input
            style={{ flex:1, background:'none', border:'none', outline:'none', color:C.text, fontSize:14 }}
            placeholder="Buscar movimiento..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, padding:4, marginBottom:16, gap:4 }}>
          {TABS.map((t,i)=>(
            <button key={t} onClick={()=>setTab(i)} style={{
              flex:1, padding:'8px 0', borderRadius:10, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
              background: tab===i ? C.accent : 'transparent',
              color: tab===i ? '#fff' : C.textMuted,
              transition:'all 0.2s',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:'0 16px' }}>
        {Object.entries(grouped).sort((a,b)=>b[0].localeCompare(a[0])).map(([date, txns]) => (
          <div key={date} style={{ marginBottom:20 }}>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, marginBottom:8, textTransform:'uppercase' }}>
              {new Date(date+'T12:00:00').toLocaleDateString('es-CO',{weekday:'long',day:'2-digit',month:'long'})}
            </div>
            <div style={{ ...card }}>
              {txns.map((t,i)=>(
                <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:i<txns.length-1?12:0, marginBottom:i<txns.length-1?12:0, borderBottom:i<txns.length-1?`1px solid ${C.border}`:'none' }}>
                  <div style={{ width:42, height:42, borderRadius:13, background:`${t.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{t.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:C.text, fontSize:14, fontWeight:500 }}>{t.desc}</div>
                    <div style={{ color:C.textMuted, fontSize:11, marginTop:2 }}>{t.category}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ color:t.type==='income'?C.accent:C.text, fontSize:14, fontWeight:700 }}>
                      {t.type==='income'?'+':'-'}{fmt(t.amount)}
                    </div>
                    <div style={{ color:C.textMuted, fontSize:10, marginTop:1 }}>{t.type==='income'?'Ingreso':'Gasto'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 0', color:C.textMuted }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
            <div style={{ fontSize:14 }}>Sin resultados</div>
          </div>
        )}
      </div>
    </div>
  );
}
