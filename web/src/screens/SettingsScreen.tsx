import React, { useState, useEffect } from 'react';
import { C, card } from '../theme';
import {
  startGmailAuth, getStoredToken, getStoredEmail,
  syncGmailTransactions, disconnectGmail,
  type ParsedTransaction, type SyncResult,
} from '../services/gmail';

type SyncState = 'idle' | 'syncing' | 'done' | 'error';

export function SettingsScreen() {
  const [token,     setToken]   = useState<string|null>(null);
  const [email,     setEmail]   = useState<string|null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [result,    setResult]  = useState<SyncResult|null>(null);
  const [errorMsg,  setErrorMsg] = useState('');

  useEffect(()=>{
    const stored = getStoredToken();
    if (stored) { setToken(stored); setEmail(getStoredEmail()); }
  }, []);

  async function handleSync(t: string) {
    setSyncState('syncing');
    setErrorMsg('');
    try {
      const res = await syncGmailTransactions(t);
      setResult(res);
      setEmail(res.gmailAddress);
      setSyncState('done');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      if (msg.includes('401')) {
        disconnectGmail();
        setToken(null);
        setErrorMsg('Tu sesión de Google expiró. Vuelve a conectar.');
      } else {
        setErrorMsg(msg);
      }
      setSyncState('error');
    }
  }

  function handleConnect() {
    startGmailAuth();
  }

  function handleDisconnect() {
    disconnectGmail();
    setToken(null);
    setEmail(null);
    setResult(null);
    setSyncState('idle');
  }

  const connected = !!token;

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0F2563,#070B14)', padding:'48px 20px 24px' }}>
        <div style={{ color:C.text, fontSize:22, fontWeight:800, marginBottom:4 }}>Configuración</div>
        <div style={{ color:C.textMuted, fontSize:13 }}>Sincroniza tu correo con Nexo</div>
      </div>

      <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Gmail card */}
        <div style={{ ...card, border: connected ? `1px solid ${C.accent}44` : `1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:'#EA433522', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>✉️</div>
            <div style={{ flex:1 }}>
              <div style={{ color:C.text, fontSize:16, fontWeight:700 }}>Gmail</div>
              <div style={{ color:C.textMuted, fontSize:12, marginTop:2 }}>
                {email ?? 'No conectado'}
              </div>
            </div>
            {connected && (
              <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(34,197,94,0.12)', border:`1px solid rgba(34,197,94,0.3)`, borderRadius:999, padding:'4px 10px' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:C.accent }} />
                <span style={{ color:C.accent, fontSize:11, fontWeight:600 }}>Activo</span>
              </div>
            )}
          </div>

          {/* Not connected */}
          {!connected && (
            <>
              <p style={{ color:C.textSec, fontSize:13, lineHeight:1.6, marginBottom:16 }}>
                Nexo lee los correos de <strong style={{color:C.text}}>Bancolombia, Davivienda y Nequi</strong> y registra tus movimientos automáticamente.
              </p>
              <button onClick={handleConnect} style={{ width:'100%', padding:'14px 0', borderRadius:14, border:'none', background:'linear-gradient(135deg,#EA4335,#C62828)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}>
                Conectar con Google
              </button>
            </>
          )}

          {/* Syncing */}
          {connected && syncState === 'syncing' && (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📬</div>
              <div style={{ color:C.text, fontSize:14, fontWeight:600 }}>Leyendo correos...</div>
              <div style={{ color:C.textMuted, fontSize:12, marginTop:4 }}>Buscando movimientos de tus bancos</div>
              <div style={{ marginTop:16, height:3, background:C.border, borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', background:C.accent, borderRadius:2, animation:'progress 3s ease-in-out infinite' }} />
              </div>
            </div>
          )}

          {/* Error */}
          {syncState === 'error' && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:`1px solid rgba(239,68,68,0.3)`, borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ color:C.danger, fontSize:13 }}>⚠️ {errorMsg}</div>
            </div>
          )}

          {/* Connected idle or done */}
          {connected && (syncState === 'idle' || syncState === 'done' || syncState === 'error') && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>handleSync(token!)} style={{ flex:1, padding:'12px 0', borderRadius:12, border:'none', background:'linear-gradient(135deg,#22C55E,#16A34A)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                {syncState === 'done' ? '🔄 Sincronizar de nuevo' : '🔄 Sincronizar ahora'}
              </button>
              <button onClick={handleDisconnect} style={{ padding:'12px 14px', borderRadius:12, border:`1px solid ${C.border}`, background:'transparent', color:C.textMuted, fontSize:13, cursor:'pointer' }}>
                Desconectar
              </button>
            </div>
          )}

          {/* Results */}
          {result && syncState === 'done' && (
            <div style={{ marginTop:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                <MiniStat label="Correos" value={String(result.emailsScanned)} color={C.primaryGlow} />
                <MiniStat label="Movimientos" value={String(result.transactionsCreated)} color={C.accent} />
                <MiniStat label="Cuenta" value={result.gmailAddress.split('@')[0]} color={C.textSec} />
              </div>

              {result.transactions.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {result.transactions.map((t,i)=>(
                    <TransactionRow key={i} tx={t} />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'20px 0', color:C.textMuted, fontSize:13 }}>
                  No se encontraron correos de bancos en los últimos 30 días.
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
              { name:'Bancolombia',     icon:'🏦', color:'#FFCD00', status:'Activo' },
              { name:'Davivienda',      icon:'🏦', color:'#E8192C', status:'Activo' },
              { name:'Nequi',           icon:'📱', color:'#7B3FF2', status:'Activo' },
              { name:'Banco de Bogotá', icon:'🏦', color:'#003087', status:'Próximamente' },
              { name:'Falabella',       icon:'💳', color:'#8BC34A', status:'Próximamente' },
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

        {/* Privacy note */}
        <div style={{ ...card, background:'rgba(59,130,246,0.06)', border:`1px solid rgba(59,130,246,0.2)` }}>
          <div style={{ color:C.primaryGlow, fontSize:13, fontWeight:700, marginBottom:8 }}>🔒 Privacidad</div>
          <div style={{ color:C.textSec, fontSize:12, lineHeight:1.7 }}>
            Nexo solicita acceso de <strong style={{color:C.text}}>solo lectura</strong> a tu Gmail. Nunca escribe, envía ni comparte tus correos. Los datos se procesan localmente en tu navegador.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progress {
          0%   { width: 0%; margin-left: 0 }
          50%  { width: 60%; margin-left: 20% }
          100% { width: 0%; margin-left: 100% }
        }
      `}</style>
    </div>
  );
}

function TransactionRow({ tx }: { tx: ParsedTransaction }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, background:'#070B14', borderRadius:12, padding:'10px 12px', border:`1px solid #1E2D45`, animation:'fadeIn 0.3s ease' }}>
      <div style={{ fontSize:18 }}>{tx.type==='income'?'💰':'💳'}</div>
      <div style={{ flex:1 }}>
        <div style={{ color:'#F8FAFC', fontSize:13, fontWeight:600 }}>{tx.merchant}</div>
        <div style={{ color:'#64748B', fontSize:10, marginTop:1 }}>{tx.bank} · {tx.category}</div>
      </div>
      <div style={{ color: tx.type==='income'?'#22C55E':'#F8FAFC', fontSize:13, fontWeight:700 }}>
        {tx.type==='income'?'+':'-'}${tx.amount.toLocaleString('es-CO')}
      </div>
      <div style={{ width:18, height:18, borderRadius:'50%', background:'rgba(34,197,94,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#22C55E' }}>✓</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label:string; value:string; color:string }) {
  return (
    <div style={{ background:'#070B14', borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
      <div style={{ color, fontSize:14, fontWeight:800 }}>{value}</div>
      <div style={{ color:'#64748B', fontSize:10, marginTop:2 }}>{label}</div>
    </div>
  );
}
