import React, { useState, useRef, useEffect } from 'react';
import { C, fmt, card } from '../theme';
import { supabase } from '../lib/supabase';
import { parseEmail } from '../lib/emailParsers';

const RAILWAY_API = import.meta.env.VITE_API_URL as string ?? 'https://nexo-finanzas-tech-production.up.railway.app/api/v1';

interface Transaction {
  date:        string;
  description: string;
  amount:      number;
  type:        'income' | 'expense';
  category:    string;
  bank:        string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function guessCategory(desc: string, type: 'income' | 'expense'): string {
  if (type === 'income') {
    if (/nómin|salari/i.test(desc))      return 'Salario';
    if (/freelanc|honorari/i.test(desc)) return 'Freelance';
    return 'Ingresos';
  }
  const d = desc.toLowerCase();
  if (/éxito|carulla|jumbo|d1|ara|supermercado|alkosto|mercado/i.test(d)) return 'Alimentación';
  if (/uber|taxi|didi|cabify|sitp|transporte/i.test(d))                   return 'Transporte';
  if (/netflix|spotify|disney|hbo|prime|cine/i.test(d))                   return 'Entretenimiento';
  if (/farmacia|droguería|cruz verde|salud|clínica|médic/i.test(d))       return 'Salud';
  if (/arriendo|renta|vivienda|inmobili/i.test(d))                        return 'Vivienda';
  if (/gym|bodytech|smartfit|fitness/i.test(d))                           return 'Deporte';
  return 'Otros';
}

function parseCOP(s: string): number {
  return Math.abs(parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0);
}

function parseCSV(text: string, bank: string): Transaction[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const results: Transaction[] = [];
  const headerIdx = lines.findIndex(l =>
    /fecha|date|descripci|concepto|valor|monto|debito|credito/i.test(l)
  );
  const dataLines = headerIdx >= 0 ? lines.slice(headerIdx + 1) : lines.slice(1);

  for (const line of dataLines) {
    const cols = line.split(/[;,]/).map(c => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 3) continue;
    const dateCol = cols.find(c => /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(c)) ?? '';
    if (!dateCol) continue;
    const desc = cols
      .filter(c => c !== dateCol && !/^[\d.,\-\s]+$/.test(c) && c.length > 2)
      .sort((a, b) => b.length - a.length)[0] ?? 'Movimiento';
    const nums = cols
      .filter(c => /^-?[\d.,]+$/.test(c.replace(/\s/g, '')))
      .map(parseCOP).filter(n => n > 0);
    if (nums.length === 0) continue;
    let amount = 0, type: 'income' | 'expense' = 'expense';
    if (nums.length >= 2) {
      const [debit, credit] = nums;
      if (credit > 0 && debit === 0) { amount = credit; type = 'income'; }
      else { amount = debit; type = 'expense'; }
    } else {
      const raw = cols.find(c => /^-?[\d.,]+$/.test(c.replace(/\s/g, ''))) ?? '0';
      amount = parseCOP(raw);
      type = raw.trim().startsWith('-') ? 'expense' : 'income';
    }
    if (amount === 0) continue;
    const dateParts = dateCol.match(/(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/);
    let iso = new Date().toISOString().slice(0, 10);
    if (dateParts) {
      const [, a, b, c] = dateParts;
      iso = a.length === 4 ? `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}` : `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
    }
    results.push({ date: iso, description: desc, amount, type, category: guessCategory(desc, type), bank });
  }
  return results;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BANKS = [
  { id:'bancolombia', name:'Bancolombia', icon:'🏦', color:'#FFCD00',
    steps:['Ingresa a la app o web de Bancolombia','Ve a Cuentas → tu cuenta → Extracto','Selecciona el período','Descarga en formato Excel o CSV'] },
  { id:'davivienda', name:'Davivienda',   icon:'🏦', color:'#E8192C',
    steps:['Ingresa a la app o web de Davivienda','Ve a Mis productos → tu cuenta → Extracto','Selecciona el período','Descarga en formato Excel o CSV'] },
  { id:'nequi',      name:'Nequi',        icon:'📱', color:'#7B3FF2',
    steps:['Abre Nequi','Ve a Movimientos','Toca los tres puntos (⋮)','Exportar movimientos → CSV'] },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function SettingsScreen({ userId }: { userId: string }) {
  const [tab, setTab]               = useState<'gmail'|'csv'>('gmail');
  const [selectedBank, setSelectedBank] = useState<string|null>(null);
  const [imported, setImported]     = useState<Transaction[]>([]);
  const [csvStatus, setCsvStatus]   = useState<'idle'|'done'|'error'>('idle');
  const [csvError, setCsvError]     = useState('');

  // Gmail state — seed from cache to avoid flash on navigation
  const [gmailConnected, setGmailConnected] = useState(() => localStorage.getItem('nexo_gmail_connected') === '1');
  const [gmailEmail, setGmailEmail]         = useState(() => localStorage.getItem('nexo_gmail_email') ?? '');
  const [gmailCount, setGmailCount]         = useState(0);
  const [gmailLoading, setGmailLoading]     = useState(false);
  const [gmailError, setGmailError]         = useState('');
  const [syncing, setSyncing]               = useState(false);
  const [lastSync, setLastSync]             = useState<string|null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const bank    = BANKS.find(b => b.id === selectedBank);

  // Check connection status on mount
  useEffect(() => {
    fetch(`${RAILWAY_API}/email-sync/status-public?userId=${encodeURIComponent(userId)}`)
      .then(r => r.json() as Promise<{ connected: boolean; lastSync: string | null }>)
      .then(d => {
        if (d.connected) {
          setGmailConnected(true);
          localStorage.setItem('nexo_gmail_connected', '1');
          setLastSync(d.lastSync ? new Date(d.lastSync).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' }) : null);
        }
      })
      .catch(() => {/* silent */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect ?gmail=connected on load (iPhone full-redirect flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'connected') {
      setGmailConnected(true);
      localStorage.setItem('nexo_gmail_connected', '1');
      const em = params.get('email') ?? '';
      setGmailEmail(em);
      if (em) localStorage.setItem('nexo_gmail_email', em);
      setGmailCount(Number(params.get('count') ?? 0));
      setLastSync(new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' }));
      // Clean URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Listen for postMessage from the Railway OAuth popup (desktop)
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'nexo_gmail_connected') {
        setGmailConnected(true);
        localStorage.setItem('nexo_gmail_connected', '1');
        const em = e.data.email ?? '';
        setGmailEmail(em);
        if (em) localStorage.setItem('nexo_gmail_email', em);
        setGmailCount(e.data.count ?? 0);
        setGmailLoading(false);
        setLastSync(new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' }));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  async function syncNow() {
    setSyncing(true);
    try {
      // Step 1: Fetch raw emails from backend (Railway only does Gmail proxy)
      const emailsRes = await fetch(`${RAILWAY_API}/email-sync/fetch-emails-public?userId=${encodeURIComponent(userId)}`);
      const emails = await emailsRes.json() as { messageId: string; bank: string; subject: string; body: string; date: string }[];

      // Step 2: Parse emails in the browser using the local parser
      const parsed = emails.flatMap(email => {
        const result = parseEmail(email.bank, email.body, email.subject);
        if (!result || result.amount <= 0) return [];
        return [{ ...result, messageId: email.messageId, date: email.date }];
      });

      if (parsed.length === 0) {
        setLastSync(`${new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })} · ${emails.length} correos / 0 nuevos`);
        return;
      }

      // Step 3: Insert via Supabase JS (user is authenticated → no RLS issues)
      let created = 0;
      for (const txn of parsed) {
        const { error } = await supabase.from('transactions').upsert({
          user_id: userId,
          transaction_type: txn.type,
          amount: txn.amount,
          description: txn.description,
          date: txn.date,
          gmail_message_id: txn.messageId,
          currency_code: 'COP',
          notes: `Auto-importado`,
        }, { onConflict: 'user_id,gmail_message_id' });
        if (!error) created++;
      }

      setGmailCount(prev => prev + created);
      setLastSync(`${new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })} · ${emails.length} correos / ${created} nuevos`);
    } catch (e) {
      setLastSync('Error al sincronizar');
      console.error('Sync error:', e);
    } finally {
      setSyncing(false);
    }
  }

  async function connectGmail() {
    setGmailLoading(true);
    setGmailError('');
    try {
      const res = await fetch(`${RAILWAY_API}/email-sync/auth/google?state=${encodeURIComponent(userId)}`);
      const data = await res.json() as { url: string };

      const popup = window.open(data.url, 'nexo_gmail', 'width=520,height=660,left=400,top=100,toolbar=no,menubar=no');
      if (!popup || popup.closed) {
        // Safari blocked popup → full redirect
        window.location.href = data.url;
        return;
      }

      // Watch for popup close without postMessage
      const check = setInterval(() => {
        if (popup.closed) {
          clearInterval(check);
          setGmailLoading(false);
        }
      }, 800);
    } catch {
      setGmailError('No se pudo contactar el servidor. Verifica la conexión.');
      setGmailLoading(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedBank) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const txns = parseCSV(text, bank?.name ?? selectedBank);
        if (txns.length === 0) {
          setCsvError('No se encontraron movimientos. Asegúrate de exportar como CSV (no PDF).');
          setCsvStatus('error');
        } else {
          setImported(txns);
          setCsvStatus('done');
        }
      } catch {
        setCsvError('Error leyendo el archivo. Intenta exportarlo de nuevo desde el banco.');
        setCsvStatus('error');
      }
    };
    reader.readAsText(file, 'latin1');
    e.target.value = '';
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0F2563,#070B14)', padding:'48px 20px 24px' }}>
        <div style={{ color:C.text, fontSize:22, fontWeight:800, marginBottom:4 }}>Sincronizar banco</div>
        <div style={{ color:C.textMuted, fontSize:13 }}>Conecta Gmail o sube un extracto CSV</div>
      </div>

      {/* Tab switcher */}
      <div style={{ display:'flex', gap:0, margin:'16px 16px 0', borderRadius:14, overflow:'hidden', border:`1px solid ${C.border}` }}>
        {(['gmail','csv'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex:1, padding:'11px 0', border:'none', cursor:'pointer', fontWeight:700, fontSize:13,
              background: tab===t ? 'linear-gradient(135deg,#1d4ed8,#7c3aed)' : C.surface,
              color: tab===t ? '#fff' : C.textMuted }}>
            {t === 'gmail' ? '✉️  Gmail automático' : '📂  Subir extracto'}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px 16px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* ── GMAIL TAB ── */}
        {tab === 'gmail' && (
          <>
            {!gmailConnected ? (
              <div style={{ ...card }}>
                <div style={{ color:C.text, fontSize:16, fontWeight:800, marginBottom:8 }}>Sincronización automática</div>
                <div style={{ color:C.textSec, fontSize:13, lineHeight:1.7, marginBottom:20 }}>
                  Nexo lee los correos de alerta de <strong style={{color:C.text}}>Bancolombia</strong>, <strong style={{color:C.text}}>Davivienda</strong> y <strong style={{color:C.text}}>Nequi</strong> y registra tus movimientos automáticamente. Solo lectura — Nexo nunca modifica tu correo.
                </div>

                {gmailError && (
                  <div style={{ background:'rgba(239,68,68,0.1)', border:`1px solid rgba(239,68,68,0.3)`, borderRadius:10, padding:'10px 14px', marginBottom:16, color:C.danger, fontSize:13 }}>
                    ⚠️ {gmailError}
                  </div>
                )}

                <button onClick={connectGmail} disabled={gmailLoading}
                  style={{ width:'100%', padding:'15px 0', borderRadius:14, border:'none', cursor: gmailLoading ? 'default' : 'pointer',
                    background: gmailLoading ? C.surface : 'linear-gradient(135deg,#1d4ed8,#7c3aed)',
                    color:'#fff', fontSize:15, fontWeight:700, opacity: gmailLoading ? 0.7 : 1 }}>
                  {gmailLoading ? '⏳ Esperando autorización…' : '🔗 Conectar Gmail'}
                </button>

                <div style={{ marginTop:12, display:'flex', alignItems:'flex-start', gap:8 }}>
                  <span style={{ color:C.accent, fontSize:12, marginTop:1 }}>🔒</span>
                  <div style={{ color:C.textMuted, fontSize:11, lineHeight:1.6 }}>
                    Usa OAuth 2.0 seguro. Nexo nunca almacena tu contraseña. Puedes revocar el acceso en cualquier momento desde tu cuenta Google.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ ...card, border:`1px solid rgba(34,197,94,0.3)`, background:'rgba(34,197,94,0.05)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                  <div style={{ width:44, height:44, borderRadius:14, background:'rgba(34,197,94,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>✅</div>
                  <div>
                    <div style={{ color:C.text, fontSize:15, fontWeight:700 }}>Gmail conectado</div>
                    <div style={{ color:C.textMuted, fontSize:12 }}>{gmailEmail}</div>
                  </div>
                </div>
                <div style={{ background:'rgba(34,197,94,0.1)', borderRadius:10, padding:'10px 14px', color:C.accent, fontSize:13, fontWeight:600 }}>
                  {gmailCount} movimiento{gmailCount !== 1 ? 's' : ''} importado{gmailCount !== 1 ? 's' : ''} automáticamente
                </div>
                {lastSync && (
                  <div style={{ color:C.textMuted, fontSize:11, marginTop:8, textAlign:'center' }}>
                    Última sync: {lastSync}
                  </div>
                )}
                <button onClick={syncNow} disabled={syncing}
                  style={{ width:'100%', marginTop:12, padding:'12px 0', borderRadius:12, border:'none', cursor: syncing ? 'default' : 'pointer',
                    background: syncing ? C.surface : 'rgba(34,197,94,0.15)',
                    color: C.accent, fontSize:14, fontWeight:700, opacity: syncing ? 0.7 : 1 }}>
                  {syncing ? '⏳ Sincronizando…' : '🔄 Sincronizar ahora'}
                </button>
                <div style={{ color:C.textMuted, fontSize:11, marginTop:8, textAlign:'center', lineHeight:1.5 }}>
                  Nexo sincroniza automáticamente 2 veces al día (6am y 8pm).
                </div>
              </div>
            )}

            {/* How it works */}
            <div style={{ ...card }}>
              <div style={{ color:C.textMuted, fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:12 }}>CÓMO FUNCIONA</div>
              {[
                ['1','Conecta tu Gmail con un clic usando Google OAuth'],
                ['2','Nexo busca correos de Bancolombia, Davivienda y Nequi'],
                ['3','Extrae el monto, comercio y fecha de cada alerta'],
                ['4','Los movimientos aparecen en tu historial automáticamente'],
              ].map(([n, text]) => (
                <div key={n} style={{ display:'flex', gap:10, marginBottom:10, alignItems:'flex-start' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(59,130,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:C.primaryGlow, fontWeight:800, flexShrink:0 }}>{n}</div>
                  <div style={{ color:C.textSec, fontSize:13, lineHeight:1.5 }}>{text}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── CSV TAB ── */}
        {tab === 'csv' && (
          <>
            <div>
              <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, marginBottom:10 }}>SELECCIONA TU BANCO</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {BANKS.map(b => (
                  <button key={b.id} onClick={() => { setSelectedBank(b.id); setCsvStatus('idle'); setImported([]); }}
                    style={{ ...card, display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer',
                      border: selectedBank===b.id ? `1px solid ${b.color}66` : `1px solid ${C.border}`,
                      background: selectedBank===b.id ? `${b.color}0D` : C.surface, textAlign:'left' }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:`${b.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{b.icon}</div>
                    <div style={{ color:C.text, fontSize:15, fontWeight:600 }}>{b.name}</div>
                    {selectedBank===b.id && <div style={{ marginLeft:'auto', color:b.color, fontSize:18 }}>✓</div>}
                  </button>
                ))}
              </div>
            </div>

            {bank && (
              <div style={{ ...card }}>
                <div style={{ color:C.text, fontSize:14, fontWeight:700, marginBottom:12 }}>¿Cómo descargar el extracto?</div>
                {bank.steps.map((step, i) => (
                  <div key={i} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background:`${bank.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:bank.color, fontWeight:800, flexShrink:0 }}>{i+1}</div>
                    <div style={{ color:C.textSec, fontSize:13, lineHeight:1.5 }}>{step}</div>
                  </div>
                ))}
                <input ref={fileRef} type="file" accept=".csv,.txt,.xls,.xlsx" style={{ display:'none' }} onChange={handleFile} />
                <button onClick={() => fileRef.current?.click()}
                  style={{ width:'100%', marginTop:16, padding:'14px 0', borderRadius:14, border:'none',
                    background:`linear-gradient(135deg,${bank.color},${bank.color}CC)`,
                    color: bank.id==='bancolombia'?'#1a1a1a':'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}>
                  📂 Subir extracto de {bank.name}
                </button>
              </div>
            )}

            {csvStatus === 'error' && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:`1px solid rgba(239,68,68,0.3)`, borderRadius:14, padding:'14px 16px' }}>
                <div style={{ color:C.danger, fontSize:13, lineHeight:1.5 }}>⚠️ {csvError}</div>
              </div>
            )}

            {csvStatus === 'done' && imported.length > 0 && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                  <div style={{ ...card, textAlign:'center' }}>
                    <div style={{ color:C.accent, fontSize:24, fontWeight:800 }}>{imported.length}</div>
                    <div style={{ color:C.textMuted, fontSize:11, marginTop:2 }}>Movimientos</div>
                  </div>
                  <div style={{ ...card, textAlign:'center' }}>
                    <div style={{ color:C.primaryGlow, fontSize:24, fontWeight:800 }}>
                      {[...new Set(imported.map(t => t.category))].length}
                    </div>
                    <div style={{ color:C.textMuted, fontSize:11, marginTop:2 }}>Categorías</div>
                  </div>
                </div>

                <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, marginBottom:10 }}>MOVIMIENTOS IMPORTADOS</div>
                <div style={{ ...card }}>
                  {imported.slice(0, 10).map((t, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
                      paddingBottom: i < Math.min(imported.length,10)-1 ? 12:0,
                      marginBottom:  i < Math.min(imported.length,10)-1 ? 12:0,
                      borderBottom:  i < Math.min(imported.length,10)-1 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ width:38, height:38, borderRadius:11,
                        background:t.type==='income'?'rgba(34,197,94,0.15)':'rgba(59,130,246,0.15)',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                        {t.type==='income'?'💰':'💳'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ color:C.text, fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.description}</div>
                        <div style={{ color:C.textMuted, fontSize:10, marginTop:1 }}>{t.category} · {t.date}</div>
                      </div>
                      <div style={{ color:t.type==='income'?C.accent:C.text, fontSize:13, fontWeight:700, flexShrink:0 }}>
                        {t.type==='income'?'+':'-'}{fmt(t.amount)}
                      </div>
                    </div>
                  ))}
                  {imported.length > 10 && (
                    <div style={{ color:C.textMuted, fontSize:12, textAlign:'center', marginTop:12 }}>
                      +{imported.length - 10} movimientos más
                    </div>
                  )}
                </div>

                <button onClick={() => { setImported([]); setCsvStatus('idle'); }}
                  style={{ width:'100%', marginTop:12, padding:'12px 0', borderRadius:14, border:`1px solid ${C.border}`, background:'transparent', color:C.textSec, fontSize:14, cursor:'pointer' }}>
                  Importar otro extracto
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Logout */}
      <div style={{ padding:'8px 16px 32px' }}>
        <button
          onClick={() => { localStorage.removeItem('nexo_gmail_connected'); localStorage.removeItem('nexo_gmail_email'); supabase.auth.signOut(); }}
          style={{ width:'100%', padding:'14px 0', borderRadius:14, border:`1px solid rgba(239,68,68,0.3)`, background:'rgba(239,68,68,0.07)', color:C.danger, fontSize:15, fontWeight:700, cursor:'pointer' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
