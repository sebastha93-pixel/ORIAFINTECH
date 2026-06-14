import React from 'react';
import { C } from '../theme';
import { OriaIcon } from './OriaIcon';

// 6 módulos: cada uno responde una pregunta.
// Inicio → ¿Cómo voy hoy? · Patrimonio → ¿Construyo riqueza? · Movimientos → ¿Qué pasa con mi dinero?
// Metas → ¿Qué tan cerca estoy? · ORIA → ¿Qué debería hacer? · Perfil → gestión
const TABS = [
  { id:'dashboard',    label:'Inicio',      icon:'🏠' },
  { id:'patrimony',    label:'Patrimonio',  icon:'📈' },
  { id:'transactions', label:'Movim.',      icon:'💳' },
  { id:'ai',           label:'ORIA',        icon:null },   // custom SVG icon
  { id:'goals',        label:'Metas',       icon:'🎯' },
  { id:'settings',     label:'Perfil',      icon:'👤' },
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
      height:'calc(72px + env(safe-area-inset-bottom))',
      paddingBottom:'max(8px, env(safe-area-inset-bottom))', zIndex:100,
    }}>
      {TABS.map(t=>{
        const isActive = active === t.id;
        const isOria   = t.id === 'ai';
        return (
          <button key={t.id} onClick={()=>onTab(t.id)} style={{
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:3, flex:1, background:'none', border:'none', cursor:'pointer',
            padding:0, position:'relative', minWidth:0,
          }}>
            {isOria ? (
              <OriaIcon size={26} active={isActive} />
            ) : (
              <span style={{ fontSize:20, lineHeight:1, filter:isActive?'none':'grayscale(1) opacity(0.5)' }}>
                {t.icon}
              </span>
            )}
            <span style={{ fontSize:9.5, fontWeight:isActive?700:400, color:isActive?C.accent:C.textMuted, whiteSpace:'nowrap' }}>
              {t.label}
            </span>
            {isActive && <div style={{ position:'absolute', bottom:-2, width:18, height:3, borderRadius:2, background:C.accent }} />}
          </button>
        );
      })}
    </div>
  );
}
