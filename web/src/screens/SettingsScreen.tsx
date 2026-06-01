import React, { useState, useRef } from 'react';
import { C, fmt, card } from '../theme';

interface Transaction {
  date:        string;
  description: string;
  amount:      number;
  type:        'income' | 'expense';
  category:    string;
  bank:        string;
}

// ── Parsers ───────────────────────────────────────────────────────────────────

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

  // Try to detect header row
  const headerIdx = lines.findIndex(l =>
    /fecha|date|descripci|concepto|valor|monto|debito|credito/i.test(l)
  );
  const dataLines = headerIdx >= 0 ? lines.slice(headerIdx + 1) : lines.slice(1);

  for (const line of dataLines) {
    // Split by semicolon or comma (handle quoted fields)
    const cols = line.split(/[;,]/).map(c => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 3) continue;

    // Find a date-like column
    const dateCol = cols.find(c => /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(c)) ?? '';
    if (!dateCol) continue;

    // Find description (longest non-numeric, non-date string)
    const desc = cols
      .filter(c => c !== dateCol && !/^[\d.,\-\s]+$/.test(c) && c.length > 2)
      .sort((a, b) => b.length - a.length)[0] ?? 'Movimiento';

    // Find numeric columns for amounts
    const nums = cols
      .filter(c => /^-?[\d.,]+$/.test(c.replace(/\s/g, '')))
      .map(parseCOP)
      .filter(n => n > 0);

    if (nums.length === 0) continue;

    // Bancolombia: separate debit/credit columns; Davivienda: signed single column
    let amount = 0;
    let type: 'income' | 'expense' = 'expense';

    if (nums.length >= 2) {
      // Two columns: debit and credit
      const [debit, credit] = nums;
      if (credit > 0 && debit === 0) { amount = credit; type = 'income'; }
      else { amount = debit; type = 'expense'; }
    } else {
      // Signed single column
      const raw = cols.find(c => /^-?[\d.,]+$/.test(c.replace(/\s/g, ''))) ?? '0';
      amount = parseCOP(raw);
      type = raw.trim().startsWith('-') ? 'expense' : 'income';
    }

    if (amount === 0) continue;

    // Normalize date to ISO
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

// ── Component ─────────────────────────────────────────────────────────────────

const BANKS = [
  { id:'bancolombia', name:'Bancolombia', icon:'🏦', color:'#FFCD00',
    steps:['Ingresa a la app o web de Bancolombia','Ve a Cuentas → tu cuenta → Extracto','Selecciona el período','Descarga en formato Excel o CSV'] },
  { id:'davivienda', name:'Davivienda',   icon:'🏦', color:'#E8192C',
    steps:['Ingresa a la app o web de Davivienda','Ve a Mis productos → tu cuenta → Extracto','Selecciona el período','Descarga en formato Excel o CSV'] },
  { id:'nequi',      name:'Nequi',        icon:'📱', color:'#7B3FF2',
    steps:['Abre Nequi','Ve a Movimientos','Toca los tres puntos (⋮)','Exportar movimientos → CSV'] },
];

export function SettingsScreen() {
  const [selectedBank, setSelectedBank] = useState<string|null>(null);
  const [imported, setImported]         = useState<Transaction[]>([]);
  const [status, setStatus]             = useState<'idle'|'done'|'error'>('idle');
  const [errorMsg, setErrorMsg]         = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const bank = BANKS.find(b => b.id === selectedBank);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedBank) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const txns = parseCSV(text, bank?.name ?? selectedBank);
        if (txns.length === 0) {
          setErrorMsg('No se encontraron movimientos en el archivo. Asegúrate de exportar como CSV o Excel (no PDF).');
          setStatus('error');
        } else {
          setImported(txns);
          setStatus('done');
        }
      } catch {
        setErrorMsg('Error leyendo el archivo. Intenta exportarlo de nuevo desde el banco.');
        setStatus('error');
      }
    };
    reader.readAsText(file, 'latin1');
    e.target.value = '';
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0F2563,#070B14)', padding:'48px 20px 24px' }}>
        <div style={{ color:C.text, fontSize:22, fontWeight:800, marginBottom:4 }}>Importar extracto</div>
        <div style={{ color:C.textMuted, fontSize:13 }}>Sube el CSV de tu banco y Nexo hace el resto</div>
      </div>

      <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Bank selector */}
        <div>
          <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, marginBottom:10 }}>SELECCIONA TU BANCO</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {BANKS.map(b => (
              <button key={b.id} onClick={() => { setSelectedBank(b.id); setStatus('idle'); setImported([]); }}
                style={{ ...card, display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer', border: selectedBank===b.id ? `1px solid ${b.color}66` : `1px solid ${C.border}`, background: selectedBank===b.id ? `${b.color}0D` : C.surface, textAlign:'left' }}>
                <div style={{ width:40, height:40, borderRadius:12, background:`${b.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{b.icon}</div>
                <div style={{ color:C.text, fontSize:15, fontWeight:600 }}>{b.name}</div>
                {selectedBank===b.id && <div style={{ marginLeft:'auto', color:b.color, fontSize:18 }}>✓</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Instructions + upload */}
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
              style={{ width:'100%', marginTop:16, padding:'14px 0', borderRadius:14, border:'none', background:`linear-gradient(135deg,${bank.color},${bank.color}CC)`, color: bank.id==='bancolombia'?'#1a1a1a':'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}>
              📂 Subir extracto de {bank.name}
            </button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{ background:'rgba(239,68,68,0.1)', border:`1px solid rgba(239,68,68,0.3)`, borderRadius:14, padding:'14px 16px' }}>
            <div style={{ color:C.danger, fontSize:13, lineHeight:1.5 }}>⚠️ {errorMsg}</div>
          </div>
        )}

        {/* Results */}
        {status === 'done' && imported.length > 0 && (
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
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, paddingBottom: i < Math.min(imported.length,10)-1 ? 12:0, marginBottom: i < Math.min(imported.length,10)-1 ? 12:0, borderBottom: i < Math.min(imported.length,10)-1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width:38, height:38, borderRadius:11, background:t.type==='income'?'rgba(34,197,94,0.15)':'rgba(59,130,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
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

            <button onClick={() => { setImported([]); setStatus('idle'); }}
              style={{ width:'100%', marginTop:12, padding:'12px 0', borderRadius:14, border:`1px solid ${C.border}`, background:'transparent', color:C.textSec, fontSize:14, cursor:'pointer' }}>
              Importar otro extracto
            </button>
          </div>
        )}

        {/* Gmail coming soon */}
        <div style={{ ...card, background:'rgba(59,130,246,0.06)', border:`1px solid rgba(59,130,246,0.2)` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontSize:20 }}>✉️</span>
            <div style={{ color:C.primaryGlow, fontSize:13, fontWeight:700 }}>Sincronización automática con Gmail</div>
            <div style={{ marginLeft:'auto', background:'rgba(59,130,246,0.2)', borderRadius:999, padding:'2px 8px', fontSize:10, color:C.primaryGlow, fontWeight:700 }}>PRÓXIMO</div>
          </div>
          <div style={{ color:C.textSec, fontSize:12, lineHeight:1.7 }}>
            Nexo detectará automáticamente los correos de Bancolombia, Davivienda y Nequi y registrará tus movimientos. En desarrollo.
          </div>
        </div>
      </div>
    </div>
  );
}
