import React from 'react';
import { C } from '../theme';

const TABS = [
  { id:'dashboard',     label:'Inicio',        icon:'🏠' },
  { id:'transactions',  label:'Movimientos',   icon:'💳' },
  { id:'add',           label:'',              icon:'＋' },
  { id:'goals',         label:'Metas',         icon:'🎯' },
  { id:'settings',      label:'Configurar',    icon:'⚙️' },
];

interface Props {
  active: string;
  onTab: (id: string) => void;
}

export function TabBar({ active, onTab }: Props) {
  return (
    <div style={{
      position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:480,
      background:C.surface, borderTop:`1px solid ${C.border}`,
      display:'flex', justifyContent:'space-around', alignItems:'center',
      height:72, paddingBottom:8, zIndex:100,
    }}>
      {TABS.map(t=>{
        const isAdd    = t.id === 'add';
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={()=>onTab(t.id)} style={{
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:3, flex:1, background:'none', border:'none', cursor:'pointer',
            padding:0, position:'relative',
          }}>
            {isAdd ? (
              <div style={{
                width:52, height:52, borderRadius:16, marginTop:-24,
                background:'linear-gradient(135deg,#22C55E,#16A34A)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:26, color:'#fff',
                boxShadow:'0 4px 20px rgba(34,197,94,0.45)',
              }}>{t.icon}</div>
            ) : (
              <>
                <span style={{ fontSize:22, lineHeight:1, filter:isActive?'none':'grayscale(1) opacity(0.5)' }}>{t.icon}</span>
                <span style={{ fontSize:10, fontWeight:isActive?700:400, color:isActive?C.accent:C.textMuted }}>{t.label}</span>
                {isActive && <div style={{ position:'absolute', bottom:-2, width:20, height:3, borderRadius:2, background:C.accent }} />}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
