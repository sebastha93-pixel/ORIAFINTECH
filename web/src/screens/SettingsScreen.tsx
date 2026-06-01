import React, { useState } from 'react';
import { C, card } from '../theme';

type SyncState = 'idle' | 'connecting' | 'syncing' | 'done' | 'error';

interface SyncResult {
  emailsScanned: number;
  transactionsCreated: number;
  lastSync: string;
}

const MOCK_EMAILS = [
  { bank:'Bancolombia', subject:'Alerta de movimiento en tu cuenta', amount:'$320.000', merchant:'Supermercado Éxito', type:'expense', time:'Hace 2 min' },
  { bank:'Bancolombia', subject:'Pago de nómina acreditado', amount:'$5.800.000', merchant:'Nómina Mayo', type:'income', time:'Hace 3 días' },
  { bank:'Davivienda', subject:'Notificación de movimiento', amount:'$45.000', merchant:'Uber', type:'expense', time:'Hace 3 días' },
  { bank:'Nequi', subject:'Enviaste dinero', amount:'$89.000', merchant:'Gimnasio BodyTech', type:'expense', time:'Hace 4 días' },
];

export function SettingsScreen() {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [connected, setConnected] = useState(false);
  const [result, setResult]       = useState<SyncResult|null>(null);
  const [detectedEmails, setDetectedEmails] = useState<typeof MOCK_EMAILS>([]);

  function handleConnect() {
    setSyncState('connecting');
    // Simulate OAuth redirect + callback
    setTimeout(()=>{
      setConnected(true);
      setSyncState('syncing');
      let count = 0;
      const interval = setInterval(()=>{
        count++;
        if (count <= MOCK_EMAILS.length) {
          setDetectedEmails(MOCK_EMAILS.slice(0, count));
        }
        if (count >= MOCK_EMAILS.length + 1) {
          clearInterval(interval);
          setSyncState('done');
          setResult({ emailsScanned: 47, transactionsCreated: 4, lastSync: new Date().toLocaleTimeString('es-CO') });
        }
      }, 600);
    }, 1800);
  }

  function handleResync() {
    setSyncState('syncing');
    setDetectedEmails([]);
    let count = 0;
    const interval = setInterval(()=>{
      count++;
      if (count <= MOCK_EMAILS.length) setDetectedEmails(MOCK_EMAILS.slice(0, count));
      if (count >= MOCK_EMAILS.length + 1) {
        clearInterval(interval);
        setSyncState('done');
        setResult({ emailsScanned: 12, transactionsCreated: 2, lastSync: new Date().toLocaleTimeString('es-CO') });
      }
    }, 500);
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0F2563,#070B14)', padding:'48px 20px 24px' }}>
        <div style={{ color:C.text, fontSize:22, fontWeight:800, marginBottom:4 }}>Configuración</div>
        <div style={{ color:C.textMuted, fontSize:13 }}>Sincroniza tu correo con Nexo</div>
      </div>

      <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Gmail connection card */}
        <div style={{ ...card, border: connected ? `1px solid ${C.accent}33` : `1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:'#EA4335', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>
              ✉️
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color:C.text, fontSize:16, fontWeight:700 }}>Gmail</div>
              <div style={{ color:C.textMuted, fontSize:12, marginTop:2 }}>
                {connected ? 'sebastian.hurtado@maledenim.com' : 'No conectado'}
              </div>
            </div>
            {connected && (
              <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(34,197,94,0.12)', border:`1px solid rgba(34,197,94,0.3)`, borderRadius:999, padding:'4px 10px' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:C.accent }} />
                <span style={{ color:C.accent, fontSize:11, fontWeight:600 }}>Activo</span>
              </div>
            )}
          </div>

          {!connected && syncState === 'idle' && (
            <>
              <p style={{ color:C.textSec, fontSize:13, lineHeight:1.6, marginBottom:16 }}>
                Nexo lee los correos de <strong style={{color:C.text}}>Bancolombia, Davivienda y Nequi</strong> automáticamente y registra tus movimientos sin que hagas nada.
              </p>
              <button onClick={handleConnect} style={{ width:'100%', padding:'14px 0', borderRadius:14, border:'none', background:'linear-gradient(135deg,#EA4335,#C62828)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                <span>G</span> Conectar con Google
              </button>
            </>
          )}

          {syncState === 'connecting' && (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🔐</div>
              <div style={{ color:C.text, fontSize:14, fontWeight:600 }}>Conectando con Google...</div>
              <div style={{ color:C.textMuted, fontSize:12, marginTop:4 }}>Autorizando acceso de solo lectura</div>
              <div style={{ marginTop:16, height:3, background:C.border, borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', background:C.accent, borderRadius:2, animation:'progress 1.8s ease forwards' }} />
              </div>
            </div>
          )}

          {(syncState === 'syncing' || syncState === 'done') && connected && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1 }}>
                  {syncState === 'syncing' ? '⏳ ESCANEANDO CORREOS...' : '✅ SINCRONIZACIÓN COMPLETA'}
                </div>
                {syncState === 'done' && (
                  <button onClick={handleResync} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'4px 10px', color:C.textSec, fontSize:11, cursor:'pointer' }}>
                    Sincronizar
                  </button>
                )}
              </div>

              {result && syncState === 'done' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                  <MiniStat label="Correos" value={String(result.emailsScanned)} color={C.primaryGlow} />
                  <MiniStat label="Movimientos" value={String(result.transactionsCreated)} color={C.accent} />
                  <MiniStat label="Última sync" value={result.lastSync} color={C.textSec} />
                </div>
              )}

              {detectedEmails.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {detectedEmails.map((e,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:C.bg, borderRadius:12, padding:'10px 12px', border:`1px solid ${C.border}`, animation:'fadeIn 0.3s ease' }}>
                      <div style={{ fontSize:18 }}>{e.type==='income'?'💰':'💳'}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ color:C.text, fontSize:13, fontWeight:600 }}>{e.merchant}</div>
                        <div style={{ color:C.textMuted, fontSize:10, marginTop:1 }}>{e.bank} · {e.time}</div>
                      </div>
                      <div style={{ color:e.type==='income'?C.accent:C.text, fontSize:13, fontWeight:700 }}>
                        {e.type==='income'?'+':'-'}{e.amount}
                      </div>
                      <div style={{ width:18, height:18, borderRadius:'50%', background:`${C.accent}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:C.accent }}>✓</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Supported banks */}
        <div>
          <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, marginBottom:10 }}>BANCOS SOPORTADOS</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { name:'Bancolombia',   icon:'🏦', color:'#FFCD00', status:'Activo' },
              { name:'Davivienda',    icon:'🏦', color:'#E8192C', status:'Activo' },
              { name:'Nequi',         icon:'📱', color:'#7B3FF2', status:'Activo' },
              { name:'Banco de Bogotá', icon:'🏦', color:'#003087', status:'Próximamente' },
              { name:'Falabella',     icon:'💳', color:'#8BC34A', status:'Próximamente' },
            ].map(b=>(
              <div key={b.name} style={{ ...card, display:'flex', alignItems:'center', gap:12, padding:'12px 14px' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:`${b.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{b.icon}</div>
                <div style={{ flex:1, color:C.text, fontSize:14, fontWeight:500 }}>{b.name}</div>
                <div style={{ fontSize:11, fontWeight:600, color: b.status==='Activo'?C.accent:C.textMuted }}>
                  {b.status==='Activo'?'● ':''}{b.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{ ...card, background:'rgba(59,130,246,0.06)', border:`1px solid rgba(59,130,246,0.2)` }}>
          <div style={{ color:C.primaryGlow, fontSize:13, fontWeight:700, marginBottom:12 }}>¿Cómo funciona?</div>
          {[
            { n:'1', text:'Autorizas acceso de solo lectura a tu Gmail' },
            { n:'2', text:'Nexo detecta correos de tus bancos automáticamente' },
            { n:'3', text:'Extrae monto, comercio y categoría de cada transacción' },
            { n:'4', text:'Los movimientos aparecen en tu dashboard al instante' },
          ].map(s=>(
            <div key={s.n} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
              <div style={{ width:20, height:20, borderRadius:'50%', background:'rgba(59,130,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:C.primaryGlow, fontWeight:700, flexShrink:0, marginTop:1 }}>{s.n}</div>
              <div style={{ color:C.textSec, fontSize:13, lineHeight:1.5 }}>{s.text}</div>
            </div>
          ))}
          <div style={{ marginTop:8, padding:'8px 12px', background:'rgba(34,197,94,0.08)', border:`1px solid rgba(34,197,94,0.2)`, borderRadius:10 }}>
            <div style={{ color:C.accent, fontSize:11 }}>🔒 Nexo solo lee correos. Nunca escribe, envía ni comparte tu información.</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progress { from{width:0} to{width:100%} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

function MiniStat({ label, value, color }: { label:string; value:string; color:string }) {
  return (
    <div style={{ background:C.bg, borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
      <div style={{ color, fontSize:14, fontWeight:800 }}>{value}</div>
      <div style={{ color:C.textMuted, fontSize:10, marginTop:2 }}>{label}</div>
    </div>
  );
}
