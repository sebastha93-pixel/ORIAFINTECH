import React, { useState } from 'react';
import { C, fmt, card } from '../theme';
import { GOALS } from '../mockData';

export function GoalsScreen() {
  const [selected, setSelected] = useState<string|null>(null);
  const totalSaved  = GOALS.reduce((s,g)=>s+g.saved,0);
  const totalTarget = GOALS.reduce((s,g)=>s+g.target,0);
  const overallPct  = Math.round((totalSaved/totalTarget)*100);

  const goal = GOALS.find(g=>g.id===selected);

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(160deg,#102040,#081426)', padding:'48px 20px 24px' }}>
        <div style={{ color:C.text, fontSize:22, fontWeight:800, marginBottom:4 }}>Metas financieras</div>
        <div style={{ color:C.textMuted, fontSize:13, marginBottom:20 }}>Tu progreso hacia la libertad</div>

        {/* Overall progress */}
        <div style={{ background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:20, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div>
              <div style={{ color:C.textMuted, fontSize:12 }}>Total ahorrado</div>
              <div style={{ color:C.text, fontSize:24, fontWeight:800 }}>{fmt(totalSaved)}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:C.accent, fontSize:28, fontWeight:800 }}>{overallPct}%</div>
              <div style={{ color:C.textMuted, fontSize:11 }}>de {fmt(totalTarget)}</div>
            </div>
          </div>
          <div style={{ height:8, background:C.border, borderRadius:4, overflow:'hidden' }}>
            <div style={{ width:`${overallPct}%`, height:'100%', background:`linear-gradient(90deg,${C.accent},${C.primaryGlow})`, borderRadius:4, transition:'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:14 }}>
        {GOALS.map(g=>{
          const pct      = Math.round((g.saved/g.target)*100);
          const remaining = g.target - g.saved;
          const months   = Math.ceil(remaining/g.monthly);
          return (
            <div key={g.id} style={{ ...card, cursor:'pointer', transition:'all 0.2s', border: selected===g.id ? `1px solid ${g.color}55`:`1px solid ${C.border}` }} onClick={()=>setSelected(selected===g.id?null:g.id)}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{ width:48, height:48, borderRadius:14, background:`${g.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{g.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text, fontSize:15, fontWeight:700 }}>{g.name}</div>
                  <div style={{ color:C.textMuted, fontSize:11, marginTop:2 }}>Meta: {fmt(g.target)}</div>
                </div>
                <div style={{ color:g.color, fontSize:20, fontWeight:800 }}>{pct}%</div>
              </div>

              <div style={{ height:8, background:C.border, borderRadius:4, overflow:'hidden', marginBottom:10 }}>
                <div style={{ width:`${pct}%`, height:'100%', background:g.color, borderRadius:4, transition:'width 0.8s ease' }} />
              </div>

              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:g.color, fontSize:12, fontWeight:700 }}>{fmt(g.saved)} ahorrado</span>
                <span style={{ color:C.textMuted, fontSize:11 }}>Faltan {fmt(remaining)}</span>
              </div>

              {selected===g.id && (
                <div style={{ marginTop:16, borderTop:`1px solid ${C.border}`, paddingTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <Stat label="Aporte mensual" value={fmt(g.monthly)} color={g.color} />
                  <Stat label="Meses restantes" value={`${months} meses`} color={g.color} />
                  <Stat label="Fecha límite" value={new Date(g.date+'T12:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})} color={C.textSec} />
                  <Stat label="Tipo" value={labelType(g.type)} color={C.textSec} />
                  <button style={{ gridColumn:'1/-1', marginTop:4, padding:'12px 0', borderRadius:12, border:`1px solid ${g.color}`, background:`${g.color}18`, color:g.color, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    + Agregar aporte
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* New goal CTA */}
        <button style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'16px 0', borderRadius:18, border:`2px dashed ${C.border}`, background:'transparent', color:C.textMuted, fontSize:14, cursor:'pointer', fontWeight:600 }}>
          <span style={{ fontSize:20 }}>＋</span> Nueva meta
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label:string; value:string; color:string }) {
  return (
    <div style={{ background:C.surfaceEl, borderRadius:12, padding:'10px 12px' }}>
      <div style={{ color:C.textMuted, fontSize:10, marginBottom:3 }}>{label}</div>
      <div style={{ color, fontSize:13, fontWeight:700 }}>{value}</div>
    </div>
  );
}

function labelType(t: string) {
  return ({ emergency_fund:'Fondo emergencia', travel:'Viaje', purchase:'Compra' } as Record<string,string>)[t] ?? t;
}
