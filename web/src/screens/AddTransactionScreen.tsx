import React, { useState, useEffect } from 'react';
import { C } from '../theme';
import { supabase } from '../lib/supabase';
import { BankLogo } from '../components/BankLogo';

const CATEGORIES = [
  { name:'Alimentación',    icon:'🛒' },
  { name:'Transporte',      icon:'🚗' },
  { name:'Entretenimiento', icon:'🎬' },
  { name:'Salud',           icon:'💊' },
  { name:'Vivienda',        icon:'🏠' },
  { name:'Deporte',         icon:'👟' },
  { name:'Educación',       icon:'📚' },
  { name:'Servicios',       icon:'💡' },
  { name:'Ropa',            icon:'👔' },
  { name:'Efectivo',        icon:'🏧' },
  { name:'Transferencias',  icon:'🔄' },
  { name:'Gasolina',        icon:'⛽' },
  { name:'Restaurante',     icon:'🍽️' },
  { name:'Otros',           icon:'📦' },
  { name:'__custom__',      icon:'✏️' },
];

const CUSTOM_MARKER = '__custom__';

interface Account { id: string; name: string; institution: string; account_suffix: string | null; }

export function AddTransactionScreen({ userId, onClose, onSaved }: {
  userId: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType]         = useState<'expense' | 'income'>('expense');
  const [amount, setAmount]     = useState('');
  const [desc, setDesc]         = useState('');
  const [cat, setCat]           = useState<string>('Otros');
  const [customCat, setCustomCat] = useState('');
  const [date, setDate]         = useState(today);
  const [accounts, setAccounts] = useState<Account[]>([]);
  // '' = not selected, 'efectivo' = cash, uuid = account
  const [accountId, setAccountId] = useState<string>('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    supabase.from('accounts').select('id, name, institution, account_suffix')
      .eq('user_id', userId).eq('is_active', true)
      .then(({ data }) => {
        const accs = (data as Account[]) ?? [];
        setAccounts(accs);
        if (accs.length === 1) setAccountId(accs[0].id); // auto-select when only 1 account
      });
  }, [userId]);

  const effectiveCat = cat === CUSTOM_MARKER ? (customCat.trim() || 'Personalizado') : cat;

  async function handleSave() {
    // Handle Colombian format: '1.000.000' → 1000000, '1.5' → 1.5
    const rawAmt = amount.replace(/[^0-9.,]/g, '');
    const amtParts = rawAmt.split('.');
    const amtLast = amtParts[amtParts.length - 1] ?? '';
    const amtNorm = (amtParts.length > 2 || (amtParts.length === 2 && amtLast.length === 3))
      ? rawAmt.replace(/\./g, '').replace(',', '.')
      : rawAmt.replace(',', '.');
    const num = parseFloat(amtNorm);
    if (!num || num <= 0) { setError('Ingresa un monto válido'); return; }
    if (num > 999_999_999_999) { setError('Monto demasiado alto'); return; }
    if (!desc.trim()) { setError('Ingresa una descripción'); return; }
    if (!accountId) { setError('Selecciona de dónde sale o entra el dinero'); return; }
    if (cat === CUSTOM_MARKER && !customCat.trim()) { setError('Escribe un nombre para la categoría personalizada'); return; }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('transactions').insert({
      user_id: userId,
      transaction_type: type,
      amount: num,
      description: desc.trim(),
      category: effectiveCat,
      date,
      notes: 'Ingresado manualmente',
      currency_code: 'COP',
      ...(accountId && accountId !== 'efectivo' ? { account_id: accountId } : {}),
    });
    setSaving(false);
    if (err) { setError('Error al guardar. Intenta de nuevo.'); return; }
    onSaved?.();
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
    color: C.text, fontSize: 15, padding: '12px 14px', outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(10,12,15,0.88)', zIndex:200,
        display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ background:C.surface, borderRadius:'24px 24px 0 0', width:'100%', maxWidth:480,
          border:`1px solid ${C.border}`, paddingBottom:32, maxHeight:'92vh',
          overflowY:'auto', WebkitOverflowScrolling:'touch' as never,
          overscrollBehavior:'contain' }}
      >
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 8px' }}>
          <div style={{ width:40, height:4, borderRadius:2, background:C.border }} />
        </div>

        <div style={{ padding:'4px 20px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ color:C.text, fontSize:17, fontWeight:700 }}>Nuevo movimiento</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.textMuted, fontSize:22, cursor:'pointer', lineHeight:1, padding:4 }}>×</button>
        </div>

        {/* Type toggle */}
        <div style={{ padding:'0 20px', marginBottom:16 }}>
          <div style={{ display:'flex', background:C.bg, borderRadius:14, border:`1px solid ${C.border}`, padding:4, gap:4 }}>
            {(['expense','income'] as const).map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                flex:1, padding:'10px 0', borderRadius:10, border:'none', cursor:'pointer', fontSize:14, fontWeight:700,
                background: type === t ? (t === 'income' ? C.accent : C.danger) : 'transparent',
                color: type === t ? '#fff' : C.textMuted,
              }}>
                {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:14 }}>
          {/* Amount */}
          <div>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:0.5, marginBottom:6 }}>MONTO</div>
            <input style={inp} type="text" inputMode="decimal" placeholder="0"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          {/* Description */}
          <div>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:0.5, marginBottom:6 }}>DESCRIPCIÓN</div>
            <input style={inp} type="text" placeholder="Ej: Mercado, Gasolina, Restaurante…"
              value={desc} onChange={e => setDesc(e.target.value)} />
          </div>

          {/* Account / source — REQUIRED */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
              <span style={{ color: C.danger, fontSize:11, fontWeight:700, letterSpacing:0.5 }}>
                {type === 'income' ? 'DESTINO *' : 'ORIGEN *'}
              </span>
              {!accountId && (
                <span style={{ fontSize:10, color:C.danger, background:'rgba(239,68,68,0.1)', padding:'2px 7px', borderRadius:6 }}>
                  Requerido
                </span>
              )}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {/* Efectivo option */}
              <button
                onClick={() => setAccountId(accountId === 'efectivo' ? '' : 'efectivo')}
                style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'9px 14px', borderRadius:12, cursor:'pointer',
                  border:`1px solid ${accountId === 'efectivo' ? C.accent : C.border}`,
                  background: accountId === 'efectivo' ? 'rgba(0,229,160,0.12)' : C.bg,
                }}>
                <span style={{ fontSize:18 }}>💵</span>
                <span style={{ color: accountId === 'efectivo' ? C.accent : C.textSec, fontSize:13, fontWeight:600 }}>
                  Efectivo
                </span>
              </button>
              {/* Registered accounts */}
              {accounts.map(a => {
                const sel = accountId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setAccountId(sel ? '' : a.id)}
                    style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'9px 14px', borderRadius:12, cursor:'pointer',
                      border:`1px solid ${sel ? C.accent : C.border}`,
                      background: sel ? 'rgba(0,229,160,0.1)' : C.bg,
                    }}>
                    <BankLogo institution={a.institution} size={22} borderRadius={6} />
                    <span style={{ color: sel ? C.accent : C.textSec, fontSize:13, fontWeight:600 }}>
                      {a.name}{a.account_suffix ? ` · *${a.account_suffix}` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category grid */}
          <div>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:0.5, marginBottom:8 }}>CATEGORÍA</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {CATEGORIES.map(c => {
                const sel = cat === c.name;
                const isCustom = c.name === CUSTOM_MARKER;
                return (
                  <button key={c.name} onClick={() => setCat(c.name)} style={{
                    padding:'10px 4px', borderRadius:12,
                    border:`1px solid ${sel ? C.accent : C.border}`,
                    background: sel ? 'rgba(0,229,160,0.1)' : C.bg,
                    cursor:'pointer', textAlign:'center',
                  }}>
                    <div style={{ fontSize:18, marginBottom:2 }}>{c.icon}</div>
                    <div style={{ color: sel ? C.accent : C.textMuted, fontSize:9, fontWeight:600, lineHeight:1.2 }}>
                      {isCustom ? (sel && customCat.trim() ? customCat.trim() : 'Personalizada') : c.name}
                    </div>
                  </button>
                );
              })}
            </div>

            {cat === CUSTOM_MARKER && (
              <input
                style={{ ...inp, marginTop:10 }}
                type="text"
                placeholder="Ej: Hijos, Mascotas, Negocio…"
                value={customCat}
                onChange={e => setCustomCat(e.target.value)}
                autoFocus
              />
            )}
          </div>

          {/* Date */}
          <div>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:0.5, marginBottom:6 }}>FECHA</div>
            <input style={inp} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {error && <div style={{ color:C.danger, fontSize:13, textAlign:'center' }}>{error}</div>}

          <button onClick={handleSave} disabled={saving || !accountId} style={{
            width:'100%', padding:'15px 0', borderRadius:14, border:'none',
            background: !accountId ? C.surfaceEl : type === 'income' ? C.accent : C.danger,
            color: !accountId ? C.textMuted : '#fff',
            fontSize:15, fontWeight:700, cursor: (!accountId || saving) ? 'default' : 'pointer',
          }}>
            {saving ? 'Guardando…' : !accountId ? 'Selecciona origen o destino' : 'Guardar movimiento'}
          </button>
        </div>
      </div>
    </div>
  );
}
