import React, { useState } from 'react';
import { C, fmt } from '../theme';

const CATEGORIES = [
  { name:'Alimentación', icon:'🛒', color:'#3B82F6' },
  { name:'Transporte',   icon:'🚗', color:'#F59E0B' },
  { name:'Vivienda',     icon:'🏠', color:'#F97316' },
  { name:'Salud',        icon:'💊', color:'#EC4899' },
  { name:'Entretenimiento', icon:'🎬', color:'#8B5CF6' },
  { name:'Deporte',      icon:'🏋️', color:'#06B6D4' },
  { name:'Salario',      icon:'💼', color:'#22C55E' },
  { name:'Freelance',    icon:'💻', color:'#22C55E' },
  { name:'Otros',        icon:'📦', color:'#64748B' },
];

export function AddTransactionScreen({ onClose }: { onClose: ()=>void }) {
  const [type, setType]   = useState<'expense'|'income'>('expense');
  const [amount, setAmount] = useState('');
  const [desc, setDesc]   = useState('');
  const [cat, setCat]     = useState<string|null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!amount || !desc) return;
    setSaved(true);
    setTimeout(onClose, 900);
  }

  if (saved) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(7,11,20,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:16 }}>✅</div>
        <div style={{ color:C.text, fontSize:18, fontWeight:700 }}>¡Guardado!</div>
      </div>
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(7,11,20,0.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:200 }} onClick={e=>{ if(e.target===e.currentTarget)onClose(); }}>
      <div style={{ background:C.surface, borderRadius:'24px 24px 0 0', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', padding:24, border:`1px solid ${C.border}` }}>
        {/* Handle */}
        <div style={{ width:40, height:4, borderRadius:2, background:C.border, margin:'0 auto 20px' }} />

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ color:C.text, fontSize:18, fontWeight:800 }}>Nuevo movimiento</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.textMuted, fontSize:22, cursor:'pointer', padding:4 }}>✕</button>
        </div>

        {/* Type toggle */}
        <div style={{ display:'flex', background:C.bg, borderRadius:14, padding:4, marginBottom:20, gap:4 }}>
          {(['expense','income'] as const).map(tp=>(
            <button key={tp} onClick={()=>setType(tp)} style={{
              flex:1, padding:'10px 0', borderRadius:10, border:'none', cursor:'pointer', fontSize:14, fontWeight:700,
              background: type===tp ? (tp==='expense'?C.danger:C.accent) : 'transparent',
              color: type===tp ? '#fff' : C.textMuted,
              transition:'all 0.2s',
            }}>{tp==='expense'?'💸 Gasto':'💰 Ingreso'}</button>
          ))}
        </div>

        {/* Amount */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ color:C.textMuted, fontSize:12, marginBottom:8 }}>MONTO</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
            <span style={{ color:C.textMuted, fontSize:24 }}>$</span>
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={e=>setAmount(e.target.value)}
              style={{ background:'none', border:'none', outline:'none', color:C.text, fontSize:42, fontWeight:800, width:'100%', textAlign:'center' }}
            />
          </div>
          <div style={{ height:2, background:`linear-gradient(90deg,transparent,${type==='expense'?C.danger:C.accent},transparent)`, marginTop:8 }} />
        </div>

        {/* Description */}
        <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:14, padding:'0 14px', height:50, display:'flex', alignItems:'center', marginBottom:16 }}>
          <input
            placeholder="Descripción..."
            value={desc}
            onChange={e=>setDesc(e.target.value)}
            style={{ flex:1, background:'none', border:'none', outline:'none', color:C.text, fontSize:14 }}
          />
        </div>

        {/* Categories */}
        <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, marginBottom:10 }}>CATEGORÍA</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:24 }}>
          {CATEGORIES.map(c=>(
            <button key={c.name} onClick={()=>setCat(c.name)} style={{
              padding:'10px 6px', borderRadius:12, border:`1px solid ${cat===c.name?c.color:C.border}`,
              background: cat===c.name?`${c.color}22`:C.bg,
              cursor:'pointer', textAlign:'center',
              transition:'all 0.15s',
            }}>
              <div style={{ fontSize:20, marginBottom:3 }}>{c.icon}</div>
              <div style={{ color:cat===c.name?c.color:C.textMuted, fontSize:10, fontWeight:600 }}>{c.name}</div>
            </button>
          ))}
        </div>

        {/* Save */}
        <button onClick={handleSave} style={{
          width:'100%', padding:'15px 0', borderRadius:16, border:'none',
          background: (!amount||!desc) ? C.border : (type==='expense'?'linear-gradient(135deg,#EF4444,#B91C1C)':'linear-gradient(135deg,#22C55E,#16A34A)'),
          color:'#fff', fontSize:16, fontWeight:800, cursor: (!amount||!desc)?'not-allowed':'pointer',
          transition:'all 0.2s',
        }}>
          Guardar movimiento
        </button>
      </div>
    </div>
  );
}
