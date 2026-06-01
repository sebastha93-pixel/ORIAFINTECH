import React, { useState, useRef, useEffect } from 'react';
import { C, fmt } from '../theme';

interface Msg { role:'user'|'ai'; text:string; ts:Date; }

const SUGGESTIONS = [
  '¿En qué gasto más este mes?',
  '¿Cuánto puedo ahorrar?',
  '¿Estoy cerca de mis metas?',
  'Analiza mis gastos',
];

const AI_REPLIES: Record<string, string> = {
  default: 'Basándome en tus datos financieros, veo que tus finanzas están bien encaminadas. Tu tasa de ahorro es del **57%** del ingreso, lo cual es excelente. ¿Hay algún área específica en la que quieras profundizar?',
  gasto: 'Tu mayor gasto este mes es **Vivienda** con $1.200.000 (38% del total). Le sigue Alimentación con $640.000 (20%). Estás dentro de rangos saludables según la regla 50/30/20. 🏠',
  ahorrar: 'Con tu ingreso actual de $6.600.000 y gastos de $2.839.900, tienes un potencial de ahorro de **$3.760.100 al mes**. Si mantienes este ritmo, en 6 meses tendrías tu fondo de emergencia completo. 💪',
  meta: 'Fondo de emergencia: **65%** — vas muy bien!\nVacaciones Cartagena: **34%** — puedes lograrlo antes de agosto si aportas $400k/mes.\nMacBook Pro: **30%** — sigue así. 🎯',
  analiz: 'Análisis de tus gastos en mayo:\n• Sin gastos innecesarios detectados ✅\n• Arriendo dentro del 38% recomendado ✅\n• Podrías reducir entretenimiento un 15% para acelerar tus metas 💡',
};

function getReply(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('gast')) return AI_REPLIES.gasto;
  if (m.includes('ahorr')) return AI_REPLIES.ahorrar;
  if (m.includes('meta')) return AI_REPLIES.meta;
  if (m.includes('analiz')) return AI_REPLIES.analiz;
  return AI_REPLIES.default;
}

export function AiChatScreen() {
  const [msgs, setMsgs]   = useState<Msg[]>([
    { role:'ai', text:'¡Hola Sebastián! 👋 Soy **Nexo AI**, tu asesor financiero inteligente.\n\nPuedo analizar tus gastos, evaluar tus metas y darte recomendaciones personalizadas. ¿En qué te ayudo hoy?', ts:new Date() },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs, typing]);

  function send(text: string) {
    if (!text.trim()) return;
    const userMsg: Msg = { role:'user', text, ts:new Date() };
    setMsgs(m=>[...m, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(()=>{
      setTyping(false);
      setMsgs(m=>[...m, { role:'ai', text:getReply(text), ts:new Date() }]);
    }, 1200 + Math.random()*600);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', paddingBottom:80 }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0F2563,#070B14)', padding:'48px 20px 20px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:16, background:'linear-gradient(135deg,#22C55E,#16A34A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🤖</div>
          <div>
            <div style={{ color:C.text, fontSize:18, fontWeight:800 }}>Nexo AI</div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:C.accent }} />
              <span style={{ color:C.accent, fontSize:12 }}>Activo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 0' }}>
        {msgs.map((m,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', marginBottom:12 }}>
            {m.role==='ai' && (
              <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#22C55E,#16A34A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, marginRight:8, flexShrink:0, alignSelf:'flex-end' }}>🤖</div>
            )}
            <div style={{
              maxWidth:'80%',
              background: m.role==='user' ? 'linear-gradient(135deg,#22C55E,#16A34A)' : C.surface,
              border: m.role==='ai' ? `1px solid ${C.border}` : 'none',
              borderRadius: m.role==='user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding:'12px 14px',
              color: C.text,
              fontSize:14,
              lineHeight:1.6,
              whiteSpace:'pre-line',
            }}>
              {renderMarkdown(m.text)}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display:'flex', alignItems:'flex-end', marginBottom:12 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#22C55E,#16A34A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, marginRight:8, flexShrink:0 }}>🤖</div>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:'18px 18px 18px 4px', padding:'14px 18px', display:'flex', gap:5 }}>
              {[0,1,2].map(i=>(
                <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:C.textMuted, animation:`bounce 1.2s ${i*0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {msgs.length <= 2 && (
        <div style={{ padding:'12px 16px 0', display:'flex', gap:8, overflowX:'auto', flexShrink:0 }}>
          {SUGGESTIONS.map(s=>(
            <button key={s} onClick={()=>send(s)} style={{ whiteSpace:'nowrap', padding:'8px 14px', borderRadius:999, border:`1px solid ${C.border}`, background:C.surface, color:C.textSec, fontSize:12, cursor:'pointer', flexShrink:0 }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'12px 16px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', background:C.surface, border:`1px solid ${C.border}`, borderRadius:18, padding:'0 8px 0 16px', gap:8 }}>
          <input
            style={{ flex:1, background:'none', border:'none', outline:'none', color:C.text, fontSize:14, height:52 }}
            placeholder="Pregúntame sobre tus finanzas..."
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&send(input)}
          />
          <button onClick={()=>send(input)} style={{ width:40, height:40, borderRadius:12, border:'none', background:input.trim()?'linear-gradient(135deg,#22C55E,#16A34A)':C.surfaceEl, color:'#fff', cursor:input.trim()?'pointer':'default', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.2s' }}>
            ↑
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%,60%,100%{transform:translateY(0)}
          30%{transform:translateY(-6px)}
        }
      `}</style>
    </div>
  );
}

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p,i)=>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ fontWeight:700 }}>{p.slice(2,-2)}</strong>
      : <span key={i}>{p}</span>
  );
}
