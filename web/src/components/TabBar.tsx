import React from 'react';
import { C } from '../theme';
import { OriaIcon } from './OriaIcon';

const TABS = [
  { id:'dashboard',    label:'Inicio',      icon:'🏠' },
  { id:'transactions', label:'Movimientos', icon:'💳' },
  { id:'ai',           label:'ORIA',        icon:null },   // custom SVG icon
  { id:'goals',        label:'Metas',       icon:'🎯' },
  { id:'settings',     label:'Ajustes',     icon:'⚙️' },
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
        const isActive = active === t.id;
        const isOria   = t.id === 'ai';
        return (
          <button key={t.id} onClick={()=>onTab(t.id)} style={{
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:3, flex:1, background:'none', border:'none', cursor:'pointer',
            padding:0, position:'relative',
          }}>
            {isOria ? (
              <OriaIcon size={28} active={isActive} />
            ) : (
              <span style={{ fontSize:22, lineHeight:1, filter:isActive?'none':'grayscale(1) opacity(0.5)' }}>
                {t.icon}
              </span>
            )}
            <span style={{ fontSize:10, fontWeight:isActive?700:400, color:isActive?C.accent:C.textMuted }}>
              {t.label}
            </span>
            {isActive && <div style={{ position:'absolute', bottom:-2, width:20, height:3, borderRadius:2, background:C.accent }} />}
          </button>
        );
      })}
    </div>
  );
}
