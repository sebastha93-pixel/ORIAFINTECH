import React, { useState, useRef, useEffect } from 'react';
import { C, gradAccent, gradHero } from '../theme';
import { supabase } from '../lib/supabase';
import { OriaLogo } from '../components/OriaLogo';

interface Msg { role:'user'|'ai'; text:string; ts:Date; }

const SUGGESTIONS = [
  '¿En qué gasto más este mes?',
  '¿Cuánto puedo ahorrar?',
  '¿Estoy cerca de mis metas?',
  'Analiza mis gastos',
];

// Centro de decisiones: cada tarjeta dispara un análisis de escenario completo.
// ORIA responde siempre con una recomendación accionable al final.
const DECISIONS = [
  { icon: '🏡', title: '¿Puedo comprar vivienda?',
    prompt: 'Analiza mis finanzas y dime si estoy en condiciones de comprar vivienda. Considera mis ingresos, gastos, ahorro mensual y deudas. Termina con una recomendación accionable concreta.' },
  { icon: '🚗', title: '¿Puedo comprar vehículo?',
    prompt: 'Evalúa si puedo comprar un vehículo sin comprometer mi salud financiera. Considera mi flujo de caja y nivel de deuda. Termina con una recomendación accionable concreta.' },
  { icon: '📈', title: '¿Debería invertir?',
    prompt: '¿Estoy en un buen momento para empezar a invertir? Evalúa primero si tengo fondo de emergencia y deudas caras. Termina con una recomendación accionable concreta.' },
  { icon: '💰', title: '¿Cómo ahorro más?',
    prompt: 'Analiza mis gastos del último mes e identifica las 3 oportunidades más grandes para ahorrar. Termina con una recomendación accionable concreta.' },
  { icon: '🎯', title: '¿Cuándo alcanzo mi meta?',
    prompt: 'Según mi ritmo de ahorro actual, ¿cuándo alcanzaré mis metas financieras activas? Termina con una recomendación accionable para llegar antes.' },
];

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api/v1';

async function callAiChat(message: string, conversationId: string | null): Promise<{ reply: string; conversation_id: string; suggestions?: string[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${API_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Error ${res.status}`);
  }
  return res.json();
}

export function AiChatScreen() {
  const [msgs, setMsgs]   = useState<Msg[]>([
    { role:'ai', text:'¡Hola! 👋 Soy **ORIA**, tu asesora financiera inteligente.\n\nPuedo analizar tus gastos, evaluar tus metas y darte recomendaciones personalizadas basadas en tus datos reales. ¿En qué te ayudo hoy?', ts:new Date() },
  ]);
  const [input, setInput]         = useState('');
  const [typing, setTyping]       = useState(false);
  const [convId, setConvId]       = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(SUGGESTIONS);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs, typing]);

  async function send(text: string) {
    if (!text.trim() || typing) return;
    const userMsg: Msg = { role:'user', text, ts:new Date() };
    setMsgs(m=>[...m, userMsg]);
    setInput('');
    setTyping(true);
    setError(null);

    try {
      const result = await callAiChat(text, convId);
      setConvId(result.conversation_id ?? convId);
      if (result.suggestions?.length) setSuggestions(result.suggestions);
      setMsgs(m=>[...m, { role:'ai', text: result.reply, ts:new Date() }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setMsgs(m=>[...m, { role:'ai', text:`Lo siento, hubo un problema al conectar con el servidor. (${msg})`, ts:new Date() }]);
      setError(msg);
    } finally {
      setTyping(false);
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', paddingBottom:'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div style={{ background:gradHero, padding:'48px 20px 20px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <OriaLogo size={44} showWordmark={false} />
          <div>
            <div style={{ color:C.text, fontSize:18, fontWeight:800 }}>ORIA · Tu asesora</div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background: error ? C.danger : C.accent }} />
              <span style={{ color: error ? C.danger : C.accent, fontSize:12 }}>{error ? 'Error de conexión' : 'Analizando tus datos reales'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 0' }}>

        {/* Centro de decisiones — visible hasta que empieza la conversación */}
        {msgs.length <= 1 && !typing && (
          <div style={{ marginBottom:18 }}>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:10 }}>
              ¿QUÉ DECISIÓN QUIERES TOMAR HOY?
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {DECISIONS.map(d => (
                <button key={d.title} onClick={() => send(d.prompt)}
                  style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
                    padding:'14px 12px', cursor:'pointer', textAlign:'left',
                    display:'flex', flexDirection:'column', gap:6 }}>
                  <span style={{ fontSize:22 }}>{d.icon}</span>
                  <span style={{ color:C.text, fontSize:12.5, fontWeight:600, lineHeight:1.35 }}>{d.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', marginBottom:12 }}>
            {m.role==='ai' && (
              <div style={{ marginRight:8, flexShrink:0, alignSelf:'flex-end' }}>
                <OriaLogo size={32} showWordmark={false} />
              </div>
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
            <div style={{ marginRight:8, flexShrink:0 }}><OriaLogo size={32} showWordmark={false} /></div>
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
          {suggestions.map(s=>(
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
            disabled={typing}
          />
          <button
            onClick={()=>send(input)}
            disabled={!input.trim() || typing}
            style={{ width:40, height:40, borderRadius:12, border:'none', background:(input.trim() && !typing) ? gradAccent : C.surfaceEl, color:'#fff', cursor:(input.trim() && !typing)?'pointer':'default', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.2s', opacity: typing ? 0.5 : 1 }}>
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
