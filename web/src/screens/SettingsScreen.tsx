import React, { useState, useRef, useEffect } from 'react';
import { C, fmt, card } from '../theme';
import { supabase } from '../lib/supabase';
import { parseEmail } from '../lib/emailParsers';
import { computeGlobalCutoff, holderNamesMatch, getAuthHeaders } from '../lib/gmailSync';
import { fetchCategoryRules, applyRules } from '../lib/categoryRules';
import { BankLogo } from '../components/BankLogo';

const RAILWAY_API = import.meta.env.VITE_API_URL as string ?? 'https://nexo-finanzas-tech-production.up.railway.app/api/v1';

interface Transaction {
  date:        string;
  description: string;
  amount:      number;
  type:        'income' | 'expense';
  category:    string;
  bank:        string;
}

interface BankAccount {
  id:                     string;
  name:                   string;
  institution:            string;
  account_type:           string;
  account_suffix:         string | null;
  account_holder:         string | null;
  currency_code:          string;
  initial_balance:        number | null;
  initial_balance_set_at: string | null;
  credit_limit:           number | null;
  credit_limit_usd:       number | null;
  payment_due_day:        number | null;
  initial_balance_usd:    number | null;
  card_network:           string | null;
  payment_status:         'current' | 'overdue' | null;
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

const INSTITUTIONS = [
  // ── Con sync automático de Gmail ──────────────────────────────────────────
  { id: 'bancolombia',  name: 'Bancolombia',          color: '#FFCD00', types: ['savings','checking','credit_card','loan'], gmailSync: true },
  { id: 'davivienda',   name: 'Davivienda',            color: '#E8192C', types: ['savings','checking','credit_card','loan'], gmailSync: true },
  { id: 'nequi',        name: 'Nequi',                 color: '#7B3FF2', types: ['savings'],                         gmailSync: true },
  // ── Registro manual ───────────────────────────────────────────────────────
  { id: 'bogota',       name: 'Banco de Bogotá',       color: '#003DA5', types: ['savings','checking','credit_card','loan'], gmailSync: false },
  { id: 'bbva',         name: 'BBVA',                  color: '#004B91', types: ['savings','checking','credit_card','loan'], gmailSync: false },
  { id: 'itau',         name: 'Itaú',                  color: '#EC7000', types: ['savings','checking','credit_card','loan'], gmailSync: false },
  { id: 'colpatria',    name: 'DAVIbank Colpatria',     color: '#EC111A', types: ['savings','checking','credit_card','loan'], gmailSync: false },
  { id: 'popular',      name: 'Banco Popular',          color: '#005BAA', types: ['savings','checking','credit_card','loan'], gmailSync: false },
  { id: 'avvillas',     name: 'AV Villas',              color: '#FF6B00', types: ['savings','checking','credit_card','loan'], gmailSync: false },
  { id: 'cajasocial',   name: 'Banco Caja Social',      color: '#D4002B', types: ['savings','checking','loan'],        gmailSync: false },
  { id: 'occidente',    name: 'Banco de Occidente',     color: '#0072BC', types: ['savings','checking','credit_card','loan'], gmailSync: false },
  { id: 'gnb',          name: 'GNB Sudameris',          color: '#1A5276', types: ['savings','checking','credit_card','loan'], gmailSync: false },
  { id: 'nubank',       name: 'Nubank',                 color: '#820AD1', types: ['savings','credit_card'],            gmailSync: false },
  { id: 'lulo',         name: 'Lulo Bank',              color: '#00C896', types: ['savings'],                         gmailSync: false },
  { id: 'rappipay',     name: 'RappiPay',               color: '#FF441F', types: ['savings'],                         gmailSync: false },
  { id: 'dale',         name: 'Dale!',                  color: '#6C00EA', types: ['savings'],                         gmailSync: false },
  { id: 'otro',         name: 'Otro banco',             color: '#6b7280', types: ['savings','checking','credit_card','loan'], gmailSync: false },
];

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  savings:     'Ahorros',
  checking:    'Corriente',
  credit_card: 'Crédito',
  loan:        'Hipoteca / Préstamo',
};

const CARD_NETWORKS = [
  { id: 'visa',       name: 'Visa',        color: '#1A1F71' },
  { id: 'mastercard', name: 'Mastercard',   color: '#EB001B' },
  { id: 'amex',       name: 'Amex',         color: '#2E77BC' },
  { id: 'diners',     name: 'Diners Club',  color: '#004B87' },
  { id: 'other',      name: 'Otra',         color: '#6b7280' },
];

const BANKS = [
  { id:'bancolombia',  name:'Bancolombia',         color:'#FFCD00',
    steps:['Ingresa a la app o web de Bancolombia','Ve a Cuentas → tu cuenta → Extracto','Selecciona el período','Descarga en formato Excel o CSV'] },
  { id:'davivienda',   name:'Davivienda',           color:'#E8192C',
    steps:['Ingresa a la app o web de Davivienda','Ve a Mis productos → tu cuenta → Extracto','Selecciona el período','Descarga en formato Excel o CSV'] },
  { id:'nequi',        name:'Nequi',                color:'#7B3FF2',
    steps:['Abre Nequi','Ve a Movimientos','Toca los tres puntos (⋮)','Exportar movimientos → CSV'] },
  { id:'bogota',       name:'Banco de Bogotá',      color:'#003DA5',
    steps:['Ingresa a Banca Virtual de Banco de Bogotá','Ve a Cuentas → Movimientos','Selecciona el período','Descarga en formato CSV o Excel'] },
  { id:'bbva',         name:'BBVA',                 color:'#004B91',
    steps:['Ingresa a BBVA Net Personal','Ve a Mis cuentas → Movimientos','Selecciona el período','Descarga en formato CSV'] },
  { id:'itau',         name:'Itaú',                 color:'#EC7000',
    steps:['Ingresa a la app o web de Itaú','Ve a Extractos','Selecciona el período','Descarga en formato CSV o Excel'] },
  { id:'nubank',       name:'Nubank',               color:'#820AD1',
    steps:['Abre la app Nubank','Ve a Tarjeta de crédito → Extracto','Selecciona el mes','Exportar en PDF o CSV'] },
  { id:'lulo',         name:'Lulo Bank',            color:'#00C896',
    steps:['Abre la app Lulo Bank','Ve a Movimientos','Toca Exportar','Descarga en CSV'] },
  { id:'colpatria',    name:'DAVIbank Colpatria',   color:'#EC111A',
    steps:['Ingresa al portal de DAVIbank Colpatria','Ve a Mis productos → Extractos','Selecciona el período','Descarga en CSV o Excel'] },
  { id:'popular',      name:'Banco Popular',        color:'#005BAA',
    steps:['Ingresa a la Banca Virtual de Banco Popular','Ve a Cuentas → Movimientos','Selecciona el período','Descarga en CSV'] },
  { id:'occidente',    name:'Banco de Occidente',   color:'#0072BC',
    steps:['Ingresa a la Banca Virtual de Banco de Occidente','Ve a Cuentas → Extracto','Selecciona el período','Descarga en CSV o Excel'] },
  { id:'rappipay',     name:'RappiPay',             color:'#FF441F',
    steps:['Abre la app Rappi','Ve a RappiPay → Movimientos','Toca Exportar movimientos','Descarga en CSV'] },
  { id:'otro',         name:'Otro banco',           color:'#6b7280',
    steps:['Ingresa al portal web o app de tu banco','Busca Movimientos o Extracto de cuenta','Selecciona el período deseado','Descarga en formato CSV, Excel o TXT'] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Compara nombres ignorando mayúsculas, tildes y palabras cortas.
 *  Devuelve true si algún apellido/nombre significativo del titular registrado
 *  aparece en el saludo del email (o viceversa). */
// holderNamesMatch and getAuthHeaders are imported from gmailSync (single source of truth)

// ── NotificationCard ─────────────────────────────────────────────────────────

function NotificationCard() {
  const [perm, setPerm] = React.useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );

  async function requestPerm() {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPerm(result);
    if (result === 'granted') {
      new Notification('ORIA · Notificaciones activadas', {
        body: 'Te avisaremos cuando se importen nuevos movimientos.',
        icon: '/favicon.png',
      });
    }
  }

  const label = perm === 'granted' ? 'Activadas' : perm === 'denied' ? 'Bloqueadas por el navegador' : 'Desactivadas';
  const color = perm === 'granted' ? C.accent : perm === 'denied' ? C.danger : C.textMuted;

  return (
    <div style={{ ...card }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:perm !== 'granted' ? 14 : 0 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:'rgba(0,229,160,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🔔</div>
        <div style={{ flex:1 }}>
          <div style={{ color:C.text, fontSize:14, fontWeight:700 }}>Notificaciones</div>
          <div style={{ color, fontSize:12, marginTop:2 }}>{label}</div>
        </div>
      </div>
      {perm !== 'granted' && (
        <button onClick={requestPerm} disabled={perm === 'denied'}
          style={{ width:'100%', padding:'12px 0', borderRadius:12, border:'none',
            background: perm === 'denied' ? C.surfaceEl : 'rgba(0,229,160,0.1)',
            color: perm === 'denied' ? C.textMuted : C.accent,
            fontSize:13, fontWeight:700, cursor: perm === 'denied' ? 'default' : 'pointer' }}>
          {perm === 'denied'
            ? 'Actívalas en Ajustes del navegador'
            : '🔔 Activar notificaciones'}
        </button>
      )}
      {perm === 'denied' && (
        <div style={{ color:C.textMuted, fontSize:11, marginTop:10, lineHeight:1.5, textAlign:'center' }}>
          Ve a Ajustes → Privacidad → Notificaciones y permite las de oriafintech.com
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SettingsScreen({ userId }: { userId: string }) {
  const [tab, setTab]               = useState<'gmail'|'cuentas'|'csv'>('gmail');
  const [selectedBank, setSelectedBank] = useState<string|null>(null);
  const [bankDropOpen, setBankDropOpen] = useState(false);
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
  const [diagRunning, setDiagRunning]       = useState(false);
  const [diagResult, setDiagResult]         = useState<string|null>(null);

  // Bank accounts state
  const [accounts, setAccounts]           = useState<BankAccount[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newInstitution, setNewInstitution] = useState('bancolombia');
  const [newAccountType, setNewAccountType] = useState('savings');
  const [newSuffix, setNewSuffix]           = useState('');
  const [newNickname, setNewNickname]       = useState('');
  const [newHolder, setNewHolder]           = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('');
  const [newDueDay, setNewDueDay]           = useState('');
  const [newInitialBalance, setNewInitialBalance] = useState('');
  const [newInitialBalanceUsd, setNewInitialBalanceUsd] = useState('');
  const [newCreditLimitUsd, setNewCreditLimitUsd] = useState('');
  const [newCardNetwork, setNewCardNetwork] = useState('visa');
  const [newPaymentStatus, setNewPaymentStatus] = useState<'current' | 'overdue'>('current');
  const [trm, setTrm]                       = useState(() => localStorage.getItem('nexo_trm') ?? '3516');
  const [savingAccount, setSavingAccount]   = useState(false);
  const [addAccountError, setAddAccountError] = useState('');

  // Initial balance editing: keyed by account id
  const [balanceDraft, setBalanceDraft]     = useState<Record<string, string>>({});
  const [savingBalance, setSavingBalance]   = useState<Record<string, boolean>>({});
  // Cuentas que el usuario ha desbloqueado manualmente para re-editar hoy
  const [editingBalance, setEditingBalance] = useState<Record<string, boolean>>({});

  // New layout state
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [expandedGmail, setExpandedGmail] = useState(false);
  const [expandedCsv, setExpandedCsv] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userInitials, setUserInitials] = useState('');

  // Category rules state
  type CatRule = import('../lib/categoryRules').CategoryRule;
  const [rules, setRules]                 = useState<CatRule[]>([]);
  const [showAddRule, setShowAddRule]     = useState(false);
  const [ruleField, setRuleField]         = useState<'description'|'recipient'|'merchant'>('description');
  const [rulePattern, setRulePattern]     = useState('');
  const [ruleCategory, setRuleCategory]   = useState('Transferencias');
  const [savingRule, setSavingRule]       = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const bank    = BANKS.find(b => b.id === selectedBank);

  async function loadRules() {
    const data = await fetchCategoryRules(userId);
    setRules(data);
  }

  async function addRule() {
    if (!rulePattern.trim()) return;
    setSavingRule(true);
    const { error } = await supabase.from('category_rules').insert({
      user_id: userId, field: ruleField, pattern: rulePattern.trim(), category: ruleCategory,
    });
    if (!error) {
      setRulePattern('');
      setShowAddRule(false);
      await loadRules();
    }
    setSavingRule(false);
  }

  async function deleteRule(id: string) {
    await supabase.from('category_rules').delete().eq('id', id).eq('user_id', userId);
    setRules(prev => prev.filter(r => r.id !== id));
  }

  async function loadAccounts() {
    // Try full select (requires migrations 009 and 010 to be applied in Supabase)
    const BASE_SELECT = 'id,name,institution,account_type,account_suffix,account_holder,currency_code,initial_balance,initial_balance_set_at,credit_limit,payment_due_day';
    const FULL_SELECT = BASE_SELECT + ',credit_limit_usd,initial_balance_usd,card_network,payment_status';

    const baseQuery = () =>
      supabase.from('accounts').select(BASE_SELECT).eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: true });

    const full = await supabase
      .from('accounts')
      .select(FULL_SELECT)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    // If new columns don't exist yet (migrations pending), fall back to base columns
    const rawData = full.error ? (await baseQuery()).data : full.data;
    const rows = (rawData as BankAccount[] | null) ?? [];
    setAccounts(rows);
    // Pre-fill draft inputs with existing values
    const drafts: Record<string, string> = {};
    for (const acc of rows) {
      if (acc.initial_balance != null) {
        drafts[acc.id] = String(Math.round(acc.initial_balance));
      }
    }
    setBalanceDraft(prev => ({ ...drafts, ...prev }));
  }

  // Candado activo en cuanto initial_balance_set_at esté fijado
  function isBalanceLocked(acc: BankAccount): boolean {
    return !!acc.initial_balance_set_at && !editingBalance[acc.id];
  }
  // Solo se puede desbloquear manualmente si se guardó hoy
  function canUnlockToday(acc: BankAccount): boolean {
    if (!acc.initial_balance_set_at) return false;
    return new Date(acc.initial_balance_set_at).toDateString() === new Date().toDateString();
  }

  async function saveInitialBalance(acc: BankAccount) {
    const digits = (balanceDraft[acc.id] ?? '').replace(/\D/g, '');
    const amount = digits ? parseInt(digits, 10) : 0;

    setSavingBalance(prev => ({ ...prev, [acc.id]: true }));
    // Only update the balance — never touch initial_balance_set_at (momento 0 is immutable after creation)
    const { error } = await supabase.from('accounts').update({
      initial_balance: amount,
    }).eq('id', acc.id).eq('user_id', userId);
    if (!error) {
      setEditingBalance(prev => ({ ...prev, [acc.id]: false }));
      await loadAccounts();
    }
    setSavingBalance(prev => ({ ...prev, [acc.id]: false }));
  }

  async function addAccount() {
    if (!newSuffix.trim() || newSuffix.length < 4) return;
    setSavingAccount(true);
    setAddAccountError('');
    const inst = INSTITUTIONS.find(i => i.id === newInstitution);
    const name = newNickname.trim() || `${inst?.name} ${ACCOUNT_TYPE_LABELS[newAccountType]} *${newSuffix.slice(-4)}`;
    const isCC = newAccountType === 'credit_card';
    const balanceDigits = newInitialBalance.replace(/\D/g, '');
    const initialBalance = balanceDigits ? parseInt(balanceDigits, 10) : 0;
    // Momento 0 = fecha Y hora exacta de creación de la cuenta.
    // Solo se importan correos con timestamp posterior a este momento.
    const cutoff = new Date();

    const basePayload = {
      user_id: userId,
      name,
      institution: inst?.name ?? newInstitution,
      account_type: newAccountType,
      account_suffix: newSuffix.slice(-4),
      account_holder: newHolder.trim().toUpperCase() || null,
      currency_code: 'COP',
      is_active: true,
      initial_balance: initialBalance,
      initial_balance_set_at: cutoff.toISOString(),
      ...(isCC && newCreditLimit ? { credit_limit: parseInt(newCreditLimit.replace(/\D/g, ''), 10) } : {}),
      ...(isCC && newDueDay ? { payment_due_day: parseInt(newDueDay, 10) } : {}),
    };

    let { error } = await supabase.from('accounts').insert({
      ...basePayload,
      ...(isCC && newCreditLimitUsd ? { credit_limit_usd: parseFloat(newCreditLimitUsd) } : {}),
      ...(isCC && newInitialBalanceUsd ? { initial_balance_usd: parseFloat(newInitialBalanceUsd) } : {}),
      ...(isCC ? { card_network: newCardNetwork } : {}),
      ...(isCC ? { payment_status: newPaymentStatus } : {}),
    });
    // If new columns don't exist yet (migrations pending), retry with base payload only
    if (error?.code === '42703') {
      ({ error } = await supabase.from('accounts').insert(basePayload));
    }
    if (!error) {
      await loadAccounts();
      setShowAddAccount(false);
      setNewSuffix('');
      setNewNickname('');
      setNewHolder('');
      setNewCreditLimit('');
      setNewCreditLimitUsd('');
      setNewDueDay('');
      setNewInitialBalance('');
      setNewInitialBalanceUsd('');
      setNewPaymentStatus('current');
    } else {
      setAddAccountError(error.message);
    }
    setSavingAccount(false);
  }

  async function updatePaymentStatus(id: string, status: 'current' | 'overdue') {
    const { error } = await supabase.from('accounts')
      .update({ payment_status: status })
      .eq('id', id).eq('user_id', userId);
    if (!error) setAccounts(prev => prev.map(a => a.id === id ? { ...a, payment_status: status } : a));
  }

  async function removeAccount(id: string) {
    const ok = window.confirm('¿Eliminar esta cuenta y todos sus movimientos importados?');
    if (!ok) return;
    const remaining = accounts.filter(a => a.id !== id);
    // Delete transactions linked to this specific account
    await supabase.from('transactions').delete().eq('account_id', id).eq('user_id', userId);
    // If this was the last account, also clean up orphaned Gmail transactions (account_id IS NULL)
    if (remaining.length === 0) {
      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId)
        .not('gmail_message_id', 'is', null)
        .is('account_id', null);
    }
    await supabase.from('accounts').update({ is_active: false }).eq('id', id).eq('user_id', userId);
    setAccounts(remaining);
  }

  // Check connection status and load accounts on mount
  useEffect(() => {
    getAuthHeaders().then(headers => {
      fetch(`${RAILWAY_API}/email-sync/status`, { headers })
        .then(r => r.json() as Promise<{ connected: boolean; lastSync: string | null }>)
        .then(d => {
          if (d.connected) {
            setGmailConnected(true);
            localStorage.setItem('nexo_gmail_connected', '1');
            setLastSync(d.lastSync ? new Date(d.lastSync).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' }) : null);
          }
        })
        .catch(() => {/* silent */});
    });
    loadAccounts();
    loadRules();
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
      if (e.origin !== window.location.origin) return;
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

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const email = user.email ?? '';
      const fullName = (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? '';
      const displayName = fullName || email.split('@')[0].replace(/[._]/g, ' ');
      const parts = displayName.split(/\s+/);
      setUserEmail(email);
      setUserName(parts.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '));
      setUserInitials(parts.slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || (email[0]?.toUpperCase() ?? 'U'));
    })();
  }, []);

  async function cleanAndResync() {
    const ok = window.confirm(
      '¿Limpiar movimientos auto-importados y re-sincronizar?\n\n' +
      'Se borrarán TODOS los movimientos importados desde Gmail y se ' +
      're-importarán solo los que correspondan a tus cuentas registradas.\n\n' +
      'Los movimientos añadidos manualmente NO se eliminan.'
    );
    if (!ok) return;
    setSyncing(true);
    setLastSync('Eliminando movimientos previos…');
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .not('gmail_message_id', 'is', null);
    if (error) {
      setLastSync(`Error al limpiar: ${error.message.slice(0, 80)}`);
      setSyncing(false);
      return;
    }
    // syncNow() maneja el estado syncing a partir de aquí
    await syncNow();
  }

  async function syncNow() {
    if (accounts.length === 0) {
      setLastSync('⚠️ Registra al menos una cuenta bancaria antes de sincronizar');
      return;
    }
    setSyncing(true);
    try {
      // Step 1: Fetch raw emails from backend (authenticated) + load rules
      const [headers, rules] = await Promise.all([
        getAuthHeaders(),
        fetchCategoryRules(userId),
      ]);
      const emailsRes = await fetch(`${RAILWAY_API}/email-sync/fetch-emails`, { headers });

      if (!emailsRes.ok) {
        const body = await emailsRes.text().catch(() => '');
        if (emailsRes.status === 401 || body.includes('token refresh failed') || body.includes('reconnect')) {
          setGmailConnected(false);
          localStorage.removeItem('nexo_gmail_connected');
          localStorage.removeItem('nexo_gmail_email');
          throw new Error('Tu sesión de Gmail expiró. Reconecta tu cuenta con el botón de abajo.');
        }
        throw new Error(`HTTP ${emailsRes.status}: ${body.slice(0, 120)}`);
      }

      const rawEmails = await emailsRes.json() as unknown;
      if (!Array.isArray(rawEmails)) throw new Error('Respuesta inesperada del servidor de correo. Reconecta Gmail si el problema persiste.');
      const emails = (rawEmails as { messageId: string; bank: string; subject: string; body: string; date: string }[])
        .filter(e => e && typeof e.messageId === 'string' && typeof e.bank === 'string');

      // Parse emails — try to link to registered accounts but import regardless
      const registeredAccounts = accounts.filter(a => a.account_suffix);

      // Momento 0: single source of truth from gmailSync utility
      const globalCutoff = computeGlobalCutoff(accounts);

      type ParsedTxn = ReturnType<typeof parseEmail> & { messageId: string; date: string; account_id?: string };
      const parsed: NonNullable<ParsedTxn>[] = [];
      let cNoParse = 0, cLinked = 0, cUnlinked = 0, cBeforeCutoff = 0;

      for (const email of emails) {
        const result = parseEmail(email.bank, email.body, email.subject);
        if (!result || result.amount <= 0) { cNoParse++; continue; }

        // Comparar timestamp completo del correo vs momento 0 (fecha + hora)
        const emailTs = email.date;

        // Try to match a registered account (best-effort — does NOT block import)
        let account_id: string | undefined;
        const matchedAccount = registeredAccounts.find(a => {
          if (email.bank === 'nequi') return !!a.institution?.toLowerCase().includes('nequi');
          if (!result.accountSuffix || a.account_suffix !== result.accountSuffix) return false;
          return !!a.institution?.toLowerCase().includes(email.bank);
        });

        if (matchedAccount) {
          const holderOk =
            !matchedAccount.account_holder ||
            !result.accountHolder ||
            holderNamesMatch(matchedAccount.account_holder, result.accountHolder);

          if (holderOk) {
            account_id = matchedAccount.id; cLinked++;
            const acctCutoff = matchedAccount.initial_balance_set_at;
            if (acctCutoff && new Date(emailTs) < new Date(acctCutoff)) { cBeforeCutoff++; continue; }
          } else {
            // Holder mismatch: use global cutoff, not matched account's
            cUnlinked++;
            if (globalCutoff && new Date(emailTs) < new Date(globalCutoff)) { cBeforeCutoff++; continue; }
          }
        } else {
          if (globalCutoff && new Date(emailTs) < new Date(globalCutoff)) { cBeforeCutoff++; continue; }
          cUnlinked++;
        }

        const category = applyRules(result, rules);
        parsed.push({ ...result, category, messageId: email.messageId, date: email.date, account_id });
      }

      const time = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });

      if (parsed.length === 0) {
        const cutoffInfo = cBeforeCutoff > 0 ? ` · ${cBeforeCutoff} anteriores al momento 0` : '';
        setLastSync(`${time} · ${emails.length} correos · ${cNoParse} sin parsear${cutoffInfo} · sin movimientos nuevos`);
        return;
      }
      // Step 3: Insert via Supabase JS — parallel to avoid N×roundtrip latency
      const upsertErrors: string[] = [];
      const insertResults = await Promise.all(parsed.map(async txn => {
        const meta: Record<string, string> = {};
        if (txn.merchant)        meta.merchant         = txn.merchant;
        if (txn.recipientName)   meta.recipient_name   = txn.recipientName;
        if (txn.recipientSuffix) meta.recipient_suffix = txn.recipientSuffix;
        if (txn.transactionTime) meta.time             = txn.transactionTime;

        const { error } = await supabase.from('transactions').insert({
          user_id: userId,
          transaction_type: txn.type,
          amount: Math.min(txn.amount, 999_999_999_999),
          description: txn.description,
          category: txn.category,
          date: txn.date.slice(0, 10),
          gmail_message_id: txn.messageId,
          currency_code: 'COP',
          notes: [
            'Auto-importado',
            txn.transactionTime   ? `Hora: ${txn.transactionTime}` : null,
            txn.recipientName     ? `Destinatario: ${txn.recipientName}` : null,
            txn.recipientSuffix   ? `Cuenta destino: *${txn.recipientSuffix}` : null,
          ].filter(Boolean).join(' · '),
          ...(Object.keys(meta).length ? { metadata: meta } : {}),
          ...(txn.account_id ? { account_id: txn.account_id } : {}),
        });
        if (!error) return true;
        if (error.code !== '23505') upsertErrors.push(error.message.slice(0, 60));
        return false;
      }));
      const created = insertResults.filter(Boolean).length;

      setGmailCount(prev => prev + created);
      const errStr = upsertErrors.length > 0 ? ` ⚠️ ${upsertErrors[0]}` : '';
      const linkInfo = cLinked > 0 ? ` · ${cLinked} vinculados` : cUnlinked > 0 ? ` · ${cUnlinked} sin cuenta` : '';
      const cutoffStr = cBeforeCutoff > 0 ? ` · ${cBeforeCutoff} omitidos (antes del momento 0)` : '';
      setLastSync(`${time} · ${emails.length} correos / ${parsed.length} parseados / ${created} nuevos${linkInfo}${cutoffStr}${errStr}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastSync(`⚠️ ${msg.slice(0, 120)}`);
      console.error('Sync error:', e);
    } finally {
      setSyncing(false);
    }
  }

  async function runDiagnostic() {
    setDiagRunning(true);
    setDiagResult(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${RAILWAY_API}/email-sync/debug-sample`, { headers });
      const raw = await res.json();

      if (!Array.isArray(raw)) {
        setDiagResult(`El servidor respondió (HTTP ${res.status}):\n${JSON.stringify(raw, null, 2)}\n\n⚠️ El backend necesita redesploy para activar este endpoint.`);
        return;
      }

      const data = raw as {
        bank: string; subject: string; accountSuffix: string;
        accountHolder: string; parsed: string; body: string; bodyLen: number;
      }[];

      if (data.length === 0) {
        setDiagResult('Sin correos bancarios encontrados en tu Gmail.');
        return;
      }

      const lines = data.map((d, i) =>
        `── Email ${i + 1} ──────────────────\n` +
        `Banco:    ${d.bank}\n` +
        `Asunto:   ${d.subject}\n` +
        `Sufijo:   ${d.accountSuffix || '❌ no encontrado'}\n` +
        `Titular:  ${d.accountHolder || '❌ no encontrado'}\n` +
        `Parseado: ${d.parsed}\n` +
        `Longitud: ${d.bodyLen} chars\n` +
        `Cuerpo:\n${d.body}\n`
      ).join('\n');
      setDiagResult(lines);
    } catch (e) {
      setDiagResult('Error de red: ' + String(e));
    } finally {
      setDiagRunning(false);
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
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:C.background }}>

      {/* ── Profile header ── */}
      <div style={{ background:'linear-gradient(160deg,#0E1620,#0A0C0F)', padding:'48px 14px 20px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:999, background:C.accentBg, border:`2px solid ${C.accent}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ color:C.accent, fontSize:18, fontWeight:800, fontFamily:"'DM Sans',sans-serif" }}>{userInitials || '?'}</span>
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ color:C.text, fontSize:16, fontWeight:700, fontFamily:"'DM Sans',sans-serif", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{userName || 'Usuario'}</div>
            <div style={{ color:C.textMuted, fontSize:12, fontFamily:"'DM Sans',sans-serif", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{userEmail}</div>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 14px', paddingBottom:'calc(80px + env(safe-area-inset-bottom))' }}>

        {/* ── Quick sync button (visible when Gmail connected) ── */}
        {gmailConnected && (
          <div style={{ padding:'12px 0 4px', display:'flex', alignItems:'center', gap:8 }}>
            <button
              onClick={syncNow}
              disabled={syncing || accounts.length === 0}
              style={{
                flex:1, padding:'11px 0', borderRadius:10, border:'none', cursor: syncing ? 'default' : 'pointer',
                background: syncing ? C.surfaceEl : 'rgba(0,229,160,0.12)',
                color: syncing ? C.textMuted : C.accent,
                fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif",
                opacity: accounts.length === 0 ? 0.5 : 1,
              }}>
              {syncing ? '⏳ Sincronizando…' : '↻ Actualizar movimientos'}
            </button>
            {lastSync && (
              <span style={{ fontSize:10, color:C.textMuted, flexShrink:0, maxWidth:120, textAlign:'right', lineHeight:1.3, fontFamily:"'DM Sans',sans-serif" }}>
                {lastSync}
              </span>
            )}
          </div>
        )}

        {/* ── Mis cuentas ── */}
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:'0.12em', color:C.textMuted, textTransform:'uppercase', padding:'14px 0 8px' }}>
          Mis cuentas
        </div>

        {accounts.map(acc => {
          const isCC       = acc.account_type === 'credit_card';
          const isLoan     = acc.account_type === 'loan';
          const isDebt     = isCC || isLoan;
          const isExpanded = expandedAccount === acc.id;
          const locked     = isBalanceLocked(acc);
          const editable   = !locked;
          const isSaving   = savingBalance[acc.id] ?? false;
          const trmVal     = parseFloat(trm) || 3516;
          const debt       = acc.initial_balance ?? 0;
          const limit      = acc.credit_limit ?? 0;
          const debtUsd    = acc.initial_balance_usd ?? 0;
          const limitUsd   = acc.credit_limit_usd ?? 0;
          const totalDebt  = debt + debtUsd * trmVal;
          const totalLimit = limit + limitUsd * trmVal;
          const utilPct    = totalLimit > 0 ? Math.min(100, Math.round((totalDebt / totalLimit) * 100)) : null;
          const utilColor  = utilPct == null ? C.textMuted : utilPct >= 80 ? C.danger : utilPct >= 50 ? C.amber : C.accent;
          const fmtUsd     = (n: number) => 'US$' + n.toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:2 });

          return (
            <div key={acc.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, marginBottom:8 }}>
              {/* Row */}
              <div onClick={() => setExpandedAccount(isExpanded ? null : acc.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 13px', cursor:'pointer' }}>
                <BankLogo institution={acc.institution} size={32} borderRadius={8} />
                <div style={{ flex:1, minWidth:0 }}>
                  <span style={{ fontSize:12, fontWeight:500, color:C.text, fontFamily:"'DM Sans',sans-serif" }}>{acc.name}</span>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:C.textMuted, display:'block', marginTop:1 }}>
                    {ACCOUNT_TYPE_LABELS[acc.account_type] || acc.account_type}{acc.account_suffix ? ` *${acc.account_suffix}` : ''}
                  </span>
                </div>
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:500, color: isDebt ? C.danger : C.text }}>
                  {isDebt ? '-' : ''}{fmt(acc.initial_balance ?? 0)}
                </span>
              </div>
              {/* Divider */}
              <div style={{ height:1, background:C.border, margin:'0 13px' }} />
              {/* Footer */}
              <div style={{ display:'flex', padding:'8px 13px', alignItems:'center' }}>
                <span style={{ fontSize:10, color:C.textMuted, fontFamily:"'DM Sans',sans-serif" }}>{ACCOUNT_TYPE_LABELS[acc.account_type] || acc.account_type}</span>
                {gmailConnected && <span style={{ fontSize:9, fontWeight:500, color:C.accent, marginLeft:'auto', fontFamily:"'DM Sans',sans-serif" }}>Sincronizada</span>}
                <button onClick={(e) => { e.stopPropagation(); removeAccount(acc.id); }} style={{ background:'none', border:'none', color:C.danger, fontSize:11, cursor:'pointer', marginLeft: gmailConnected ? 8 : 'auto', fontFamily:"'DM Sans',sans-serif" }}>Quitar</button>
              </div>
              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 13px', display:'flex', flexDirection:'column', gap:12 }}>

                  {/* Credit card badges */}
                  {isCC && (
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      {(() => {
                        const net = CARD_NETWORKS.find(n => n.id === (acc.card_network ?? 'other'));
                        return net ? (
                          <span style={{ background:`${net.color}22`, border:`1px solid ${net.color}55`, borderRadius:6, padding:'1px 7px', fontSize:9, fontWeight:800, color:net.color }}>
                            {net.name.toUpperCase()}
                          </span>
                        ) : null;
                      })()}
                      {(() => {
                        if (acc.payment_status === 'overdue')
                          return <span style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, padding:'1px 7px', fontSize:9, fontWeight:700, color:C.danger }}>🔴 En mora</span>;
                        if (acc.payment_status === 'current')
                          return <span style={{ background:'rgba(0,229,160,0.15)', border:'1px solid rgba(0,229,160,0.3)', borderRadius:6, padding:'1px 7px', fontSize:9, fontWeight:700, color:C.accent }}>✅ Al día</span>;
                        const hasDebt = (acc.initial_balance ?? 0) > 0 || (acc.initial_balance_usd ?? 0) > 0;
                        if (!hasDebt) return <span style={{ background:'rgba(0,229,160,0.15)', border:'1px solid rgba(0,229,160,0.3)', borderRadius:6, padding:'1px 7px', fontSize:9, fontWeight:700, color:C.accent }}>✅ Al día</span>;
                        const dueDay = acc.payment_due_day;
                        if (!dueDay) return <span style={{ background:C.amberBg, border:`1px solid rgba(245,166,35,0.3)`, borderRadius:6, padding:'1px 7px', fontSize:9, fontWeight:700, color:C.amber }}>⚠️ Pendiente</span>;
                        const today = new Date().getDate();
                        if (today < dueDay) return <span style={{ background:C.amberBg, border:`1px solid rgba(245,166,35,0.3)`, borderRadius:6, padding:'1px 7px', fontSize:9, fontWeight:700, color:C.amber }}>⏰ Paga en {dueDay - today}d</span>;
                        if (today === dueDay) return <span style={{ background:'rgba(249,115,22,0.15)', border:'1px solid rgba(249,115,22,0.3)', borderRadius:6, padding:'1px 7px', fontSize:9, fontWeight:700, color:'#f97316' }}>⚡ Vence hoy</span>;
                        return <span style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, padding:'1px 7px', fontSize:9, fontWeight:700, color:C.danger }}>🔴 En mora</span>;
                      })()}
                    </div>
                  )}

                  {/* Utilization bar */}
                  {isCC && utilPct != null && (
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ color:utilColor, fontSize:10, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>{utilPct}% utilizado</span>
                        <span style={{ color:C.textMuted, fontSize:10, fontFamily:"'DM Sans',sans-serif" }}>
                          {fmt(debt)}{debtUsd > 0 ? ` + ${fmtUsd(debtUsd)}` : ''} de {fmt(limit)}{limitUsd > 0 ? ` + ${fmtUsd(limitUsd)}` : ''}
                        </span>
                      </div>
                      <div style={{ height:4, background:C.border, borderRadius:99, overflow:'hidden' }}>
                        <div style={{ width:`${utilPct}%`, height:'100%', background:utilColor, borderRadius:99 }} />
                      </div>
                      {debtUsd > 0 && (
                        <div style={{ color:C.textMuted, fontSize:9, marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>
                          TRM: ${parseFloat(trm).toLocaleString('es-CO')} · {fmtUsd(debtUsd)} ≈ {fmt(Math.round(debtUsd * (parseFloat(trm) || 3516)))} COP
                        </div>
                      )}
                    </div>
                  )}

                  {/* Balance edit */}
                  <div>
                    <div style={{ color:C.textMuted, fontSize:10, fontWeight:600, letterSpacing:0.5, marginBottom:5, fontFamily:"'DM Sans',sans-serif" }}>
                      {isCC ? 'DEUDA ACTUAL' : isLoan ? 'DEUDA PENDIENTE' : 'SALDO INICIAL'}
                    </div>
                    {editable ? (
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <div style={{ position:'relative', flex:1 }}>
                          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.textMuted, fontSize:13 }}>$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={balanceDraft[acc.id] ? Number(balanceDraft[acc.id].replace(/\D/g,'') || 0).toLocaleString('es-CO') : ''}
                            onChange={e => { const digits = e.target.value.replace(/\D/g,''); setBalanceDraft(prev => ({ ...prev, [acc.id]: digits })); }}
                            style={{ width:'100%', paddingLeft:24, paddingRight:10, paddingTop:8, paddingBottom:8, borderRadius:10, border:`1px solid ${C.border}`, background:C.surfaceMid, color:C.text, fontSize:14, fontWeight:600, boxSizing:'border-box', outline:'none' }}
                          />
                        </div>
                        <button onClick={() => saveInitialBalance(acc)} disabled={isSaving}
                          style={{ padding:'8px 14px', borderRadius:10, border:'none', background: isSaving ? C.surface : 'linear-gradient(135deg,#00E5A0,#00B87A)', color:'#fff', fontSize:12, fontWeight:700, cursor: isSaving ? 'default' : 'pointer', flexShrink:0, opacity: isSaving ? 0.7 : 1 }}>
                          {isSaving ? '…' : 'Guardar'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ color: isDebt ? C.danger : C.accent, fontSize:14, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>
                          {isDebt ? '-' : ''}{fmt(acc.initial_balance ?? 0)}
                        </span>
                        <span style={{ fontSize:13 }}>🔒</span>
                        <span style={{ color:C.textMuted, fontSize:10, fontFamily:"'DM Sans',sans-serif" }}>
                          fijado el {acc.initial_balance_set_at ? new Date(acc.initial_balance_set_at).toLocaleString('es-CO', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}
                        </span>
                        {canUnlockToday(acc) && (
                          <button onClick={() => setEditingBalance(prev => ({ ...prev, [acc.id]: true }))}
                            style={{ background:'none', border:'none', color:C.info, fontSize:11, cursor:'pointer', padding:0, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                            Editar
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payment status (credit cards only) */}
                  {isCC && (
                    <div>
                      <div style={{ color:C.textMuted, fontSize:10, fontWeight:600, letterSpacing:0.5, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>ESTADO DEL PAGO</div>
                      <div style={{ display:'flex', gap:8 }}>
                        {([
                          { val: 'current' as const, label:'✅ Al día',  bg:'rgba(0,229,160,0.12)', border:'rgba(0,229,160,0.35)', color:'#00E5A0' },
                          { val: 'overdue' as const, label:'🔴 En mora', bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.35)',  color:'#EF4444' },
                        ]).map(opt => (
                          <button key={opt.val} type="button" onClick={() => updatePaymentStatus(acc.id, opt.val)}
                            style={{ flex:1, padding:'8px 0', borderRadius:10, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif",
                              border:`1px solid ${acc.payment_status === opt.val ? opt.border : C.border}`,
                              background: acc.payment_status === opt.val ? opt.bg : 'transparent',
                              color: acc.payment_status === opt.val ? opt.color : C.textMuted }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Conectar cuenta dashed button */}
        {!showAddAccount && (
          <button onClick={() => setShowAddAccount(true)}
            style={{ width:'100%', marginBottom:8, padding:'12px 0', borderRadius:8, border:`1px dashed ${C.borderLight}`, background:'transparent', color:C.accent, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            + Conectar cuenta
          </button>
        )}

        {/* Add account form */}
        {showAddAccount && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'14px 13px', marginBottom:8, display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <div style={{ color:C.textMuted, fontSize:11, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>Banco</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {INSTITUTIONS.map(inst => (
                  <button key={inst.id} onClick={() => { setNewInstitution(inst.id); setNewAccountType(inst.types[0]); }}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10,
                      border:`1px solid ${newInstitution===inst.id ? inst.color : C.border}`,
                      background: newInstitution===inst.id ? `${inst.color}22` : C.surfaceMid, cursor:'pointer' }}>
                    <BankLogo institution={inst.name} size={22} borderRadius={6} />
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:1 }}>
                      <span style={{ color: newInstitution===inst.id ? inst.color : C.textMuted, fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>{inst.name}</span>
                      {inst.gmailSync && <span style={{ fontSize:9, color:'#00E5A0', fontWeight:700, letterSpacing:0.3, fontFamily:"'DM Sans',sans-serif" }}>✉ Gmail sync</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ color:C.textMuted, fontSize:11, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>Tipo de cuenta</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {(INSTITUTIONS.find(i => i.id === newInstitution)?.types ?? ['savings']).map(t => (
                  <button key={t} onClick={() => setNewAccountType(t)}
                    style={{ padding:'8px 14px', borderRadius:10, border:`1px solid ${newAccountType===t ? C.accent : C.border}`,
                      background: newAccountType===t ? 'rgba(0,229,160,0.1)' : C.surfaceMid,
                      color: newAccountType===t ? C.accent : C.textMuted,
                      fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ color:C.textMuted, fontSize:11, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>Últimos 4 dígitos de la cuenta</div>
              <input type="number" placeholder="ej. 1234" value={newSuffix} maxLength={4}
                onChange={e => setNewSuffix(e.target.value.slice(-4))}
                style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surfaceMid, color:C.text, fontSize:15, fontWeight:700, letterSpacing:4, boxSizing:'border-box', outline:'none' }}
              />
            </div>

            <div>
              <div style={{ color:C.textMuted, fontSize:11, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>Nombre personalizado (opcional)</div>
              <input type="text" placeholder="ej. Cuenta principal" value={newNickname}
                onChange={e => setNewNickname(e.target.value)}
                style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surfaceMid, color:C.text, fontSize:13, boxSizing:'border-box', outline:'none', fontFamily:"'DM Sans',sans-serif" }}
              />
            </div>

            {(() => {
              const inst = INSTITUTIONS.find(i => i.id === newInstitution);
              const sameBank = accounts.filter(a => a.institution?.toLowerCase() === inst?.name?.toLowerCase());
              const holderRequired = sameBank.length > 0;
              const holderMissing = holderRequired && !newHolder.trim();
              return (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <span style={{ color: holderRequired ? C.warning : C.textMuted, fontSize:11, fontWeight: holderRequired ? 700 : 400, fontFamily:"'DM Sans',sans-serif" }}>
                      Titular de la cuenta{holderRequired ? ' *' : ''}
                    </span>
                    {holderRequired && (
                      <span style={{ fontSize:10, color:C.warning, background:C.amberBg, padding:'2px 7px', borderRadius:6, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                        Requerido — ya tienes otra cuenta de {inst?.name}
                      </span>
                    )}
                  </div>
                  <input type="text" placeholder="ej. NOMBRE APELLIDO" value={newHolder}
                    onChange={e => setNewHolder(e.target.value)}
                    style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1px solid ${holderMissing ? C.warning : C.border}`, background:C.surfaceMid, color:C.text, fontSize:13, boxSizing:'border-box', outline:'none', fontFamily:"'DM Sans',sans-serif" }}
                  />
                  <div style={{ color:C.textMuted, fontSize:10, marginTop:4, lineHeight:1.5, fontFamily:"'DM Sans',sans-serif" }}>
                    Nombre exactamente como aparece en el correo del banco — distingue tus cuentas de las de otras personas en el mismo Gmail.
                  </div>
                </div>
              );
            })()}

            {/* Credit card extra fields */}
            {newAccountType === 'credit_card' && (
              <>
                <div>
                  <div style={{ color:C.textMuted, fontSize:11, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>Franquicia</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {CARD_NETWORKS.map(n => (
                      <button key={n.id} onClick={() => setNewCardNetwork(n.id)}
                        style={{ padding:'8px 14px', borderRadius:10, border:`1px solid ${newCardNetwork===n.id ? n.color : C.border}`,
                          background: newCardNetwork===n.id ? `${n.color}22` : C.surfaceMid,
                          color: newCardNetwork===n.id ? n.color : C.textMuted,
                          fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                        {n.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ color:C.textMuted, fontSize:11, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>Cupo total de la tarjeta</div>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.textMuted, fontSize:13 }}>$</span>
                    <input type="text" inputMode="numeric" placeholder="ej. 5.000.000"
                      value={newCreditLimit ? Number(newCreditLimit.replace(/\D/g,'')||0).toLocaleString('es-CO') : ''}
                      onChange={e => setNewCreditLimit(e.target.value.replace(/\D/g,''))}
                      style={{ width:'100%', paddingLeft:26, paddingRight:14, paddingTop:10, paddingBottom:10, borderRadius:10, border:`1px solid ${C.border}`, background:C.surfaceMid, color:C.text, fontSize:14, fontWeight:600, boxSizing:'border-box', outline:'none' }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ color:C.textMuted, fontSize:11, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>Día de pago (día del mes)</div>
                  <input type="number" min="1" max="31" placeholder="ej. 25" value={newDueDay}
                    onChange={e => setNewDueDay(e.target.value)}
                    style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surfaceMid, color:C.text, fontSize:14, fontWeight:600, boxSizing:'border-box', outline:'none' }}
                  />
                </div>
                <div>
                  <div style={{ color:C.textMuted, fontSize:11, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>Estado actual del pago</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {([
                      { val: 'current', label:'✅ Al día',  bg:'rgba(0,229,160,0.12)', border:'rgba(0,229,160,0.35)', active:'#00E5A0' },
                      { val: 'overdue', label:'🔴 En mora', bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.35)',  active:'#EF4444' },
                    ] as const).map(opt => (
                      <button key={opt.val} type="button" onClick={() => setNewPaymentStatus(opt.val)}
                        style={{ flex:1, padding:'10px 0', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif",
                          border:`1px solid ${newPaymentStatus===opt.val ? opt.border : C.border}`,
                          background: newPaymentStatus===opt.val ? opt.bg : 'transparent',
                          color: newPaymentStatus===opt.val ? opt.active : C.textMuted }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ color:C.textMuted, fontSize:11, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>Cupo en USD (opcional)</div>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.textMuted, fontSize:12, fontWeight:600 }}>US$</span>
                    <input type="text" inputMode="decimal" placeholder="ej. 2,000"
                      value={newCreditLimitUsd ? Number(newCreditLimitUsd||0).toLocaleString('en-US') : ''}
                      onChange={e => setNewCreditLimitUsd(e.target.value.replace(/[^0-9.]/g,''))}
                      style={{ width:'100%', paddingLeft:40, paddingRight:14, paddingTop:10, paddingBottom:10, borderRadius:10, border:`1px solid ${C.border}`, background:C.surfaceMid, color:C.text, fontSize:14, fontWeight:600, boxSizing:'border-box', outline:'none' }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ color:C.textMuted, fontSize:11, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>Deuda actual en USD (opcional)</div>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.textMuted, fontSize:12, fontWeight:600 }}>US$</span>
                    <input type="text" inputMode="decimal" placeholder="ej. 150.00"
                      value={newInitialBalanceUsd ? Number(newInitialBalanceUsd||0).toLocaleString('en-US') : ''}
                      onChange={e => setNewInitialBalanceUsd(e.target.value.replace(/[^0-9.]/g,''))}
                      style={{ width:'100%', paddingLeft:40, paddingRight:14, paddingTop:10, paddingBottom:10, borderRadius:10, border:`1px solid ${C.border}`, background:C.surfaceMid, color:C.text, fontSize:14, fontWeight:600, boxSizing:'border-box', outline:'none' }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Initial balance / current debt */}
            <div>
              <div style={{ color:C.textMuted, fontSize:11, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>
                {newAccountType === 'credit_card' ? 'Deuda actual (opcional)' : 'Saldo actual (opcional)'}
              </div>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.textMuted, fontSize:13 }}>$</span>
                <input type="text" inputMode="numeric" placeholder="0"
                  value={newInitialBalance ? Number(newInitialBalance||0).toLocaleString('es-CO') : ''}
                  onChange={e => setNewInitialBalance(e.target.value.replace(/\D/g,''))}
                  style={{ width:'100%', paddingLeft:26, paddingRight:14, paddingTop:10, paddingBottom:10, borderRadius:10, border:`1px solid ${C.border}`, background:C.surfaceMid, color:C.text, fontSize:14, fontWeight:600, boxSizing:'border-box', outline:'none' }}
                />
              </div>
              <div style={{ color:C.textMuted, fontSize:10, marginTop:4, lineHeight:1.5, fontFamily:"'DM Sans',sans-serif" }}>
                {newAccountType === 'credit_card' ? 'Tu deuda actual en esta tarjeta.' : 'Saldo de tu cuenta en este momento. ORIA solo importará movimientos a partir de ahora.'}
              </div>
            </div>

            {addAccountError && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:`1px solid rgba(239,68,68,0.3)`, borderRadius:10, padding:'10px 14px', color:C.danger, fontSize:12, lineHeight:1.5, fontFamily:"'DM Sans',sans-serif" }}>
                ⚠️ {addAccountError}
              </div>
            )}

            {(() => {
              const inst = INSTITUTIONS.find(i => i.id === newInstitution);
              const sameBank = accounts.filter(a => a.institution?.toLowerCase() === inst?.name?.toLowerCase());
              const holderRequired = sameBank.length > 0;
              const holderMissing = holderRequired && !newHolder.trim();
              const disabled = newSuffix.length < 4 || savingAccount || holderMissing;
              return (
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { setShowAddAccount(false); setNewSuffix(''); setNewNickname(''); setNewCreditLimit(''); setNewCreditLimitUsd(''); setNewInitialBalance(''); setNewInitialBalanceUsd(''); setAddAccountError(''); }}
                    style={{ flex:1, padding:'12px 0', borderRadius:12, border:`1px solid ${C.border}`, background:'transparent', color:C.textSec, fontSize:13, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    Cancelar
                  </button>
                  <button onClick={addAccount} disabled={disabled}
                    style={{ flex:2, padding:'12px 0', borderRadius:12, border:'none',
                      background: disabled ? C.surface : 'linear-gradient(135deg,#00E5A0,#00B87A)',
                      color: disabled ? C.textMuted : '#0A0C0F',
                      fontSize:13, fontWeight:700, cursor: disabled ? 'default' : 'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    {savingAccount ? 'Guardando…' : 'Guardar cuenta'}
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Reglas de auto-categorización ── */}
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:'0.12em', color:C.textMuted, textTransform:'uppercase', padding:'14px 0 8px' }}>
          Reglas de categorización
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, marginBottom:8, overflow:'hidden' }}>
          {/* Existing rules list */}
          {rules.length === 0 && !showAddRule && (
            <div style={{ padding:'14px 13px', color:C.textMuted, fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
              Sin reglas. Puedes crear reglas para que ORIA clasifique automáticamente tus transferencias frecuentes.
            </div>
          )}
          {rules.map((rule, i) => {
            const fieldLabel: Record<string, string> = { description:'Descripción', recipient:'Destinatario', merchant:'Comercio' };
            return (
              <div key={rule.id} style={{
                display:'flex', alignItems:'center', gap:8, padding:'10px 13px',
                borderTop: i > 0 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <span style={{ color:C.textMuted, fontSize:10, fontFamily:"'DM Sans',sans-serif" }}>
                    {fieldLabel[rule.field] ?? rule.field} contiene "
                  </span>
                  <span style={{ color:C.text, fontSize:10, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>{rule.pattern}</span>
                  <span style={{ color:C.textMuted, fontSize:10, fontFamily:"'DM Sans',sans-serif" }}>" →</span>
                  <span style={{ color:C.accent, fontSize:10, fontWeight:700, marginLeft:4, fontFamily:"'DM Sans',sans-serif" }}>{rule.category}</span>
                </div>
                <button onClick={() => deleteRule(rule.id)}
                  style={{ background:'none', border:'none', color:C.danger, fontSize:12, cursor:'pointer', padding:'4px 6px', flexShrink:0, fontFamily:"'DM Sans',sans-serif" }}>
                  ✕
                </button>
              </div>
            );
          })}

          {/* Add rule form */}
          {showAddRule ? (
            <div style={{ borderTop: rules.length > 0 ? `1px solid ${C.border}` : 'none', padding:'12px 13px', display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', gap:8 }}>
                <select value={ruleField} onChange={e => setRuleField(e.target.value as typeof ruleField)}
                  style={{ flex:1, padding:'9px 10px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surfaceMid, color:C.text, fontSize:13, outline:'none', fontFamily:"'DM Sans',sans-serif" }}>
                  <option value="description">Descripción</option>
                  <option value="recipient">Destinatario</option>
                  <option value="merchant">Comercio</option>
                </select>
              </div>
              <input
                type="text"
                placeholder={ruleField === 'recipient' ? 'ej: HELDA GOMEZ' : ruleField === 'merchant' ? 'ej: Éxito' : 'ej: arriendo'}
                value={rulePattern}
                onChange={e => setRulePattern(e.target.value)}
                style={{ padding:'9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surfaceMid, color:C.text, fontSize:13, outline:'none', fontFamily:"'DM Sans',sans-serif" }}
              />
              <select value={ruleCategory} onChange={e => setRuleCategory(e.target.value)}
                style={{ padding:'9px 10px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surfaceMid, color:C.text, fontSize:13, outline:'none', fontFamily:"'DM Sans',sans-serif" }}>
                {['Alimentación','Transporte','Entretenimiento','Salud','Vivienda','Deporte','Educación',
                  'Servicios','Ropa','Efectivo','Transferencias','Gasolina','Restaurante','Salario','Otros'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { setShowAddRule(false); setRulePattern(''); }}
                  style={{ flex:1, padding:'9px 0', borderRadius:10, border:`1px solid ${C.border}`, background:'transparent', color:C.textMuted, fontSize:12, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  Cancelar
                </button>
                <button onClick={addRule} disabled={savingRule || !rulePattern.trim()}
                  style={{ flex:2, padding:'9px 0', borderRadius:10, border:'none',
                    background: (!rulePattern.trim() || savingRule) ? C.surfaceEl : 'rgba(0,229,160,0.15)',
                    color: (!rulePattern.trim() || savingRule) ? C.textMuted : C.accent,
                    fontSize:12, fontWeight:700, cursor: (!rulePattern.trim() || savingRule) ? 'default' : 'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  {savingRule ? 'Guardando…' : 'Guardar regla'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ borderTop: rules.length > 0 ? `1px solid ${C.border}` : 'none', padding:'8px 13px' }}>
              <button onClick={() => setShowAddRule(true)}
                style={{ width:'100%', padding:'9px 0', borderRadius:8, border:`1px dashed ${C.borderLight}`, background:'transparent', color:C.accent, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                + Agregar regla
              </button>
            </div>
          )}
        </div>

        {/* ── Bancos disponibles ── */}
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:'0.12em', color:C.textMuted, textTransform:'uppercase', padding:'14px 0 8px' }}>
          Bancos disponibles
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:8 }}>
          {INSTITUTIONS.slice(0, 8).map(inst => (
            <button key={inst.id}
              onClick={() => { setNewInstitution(inst.id); setNewAccountType(inst.types[0]); setShowAddAccount(true); }}
              style={{ padding:'10px 4px', borderRadius:8, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                border:`1px solid ${C.border}`, background:C.surface }}>
              <BankLogo institution={inst.name} size={36} borderRadius={10} />
              <span style={{ color:C.textMuted, fontSize:8, fontWeight:600, lineHeight:1.2, textAlign:'center', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as never, fontFamily:"'DM Sans',sans-serif" }}>
                {inst.name}
              </span>
            </button>
          ))}
        </div>

        {/* ── Configuración ── */}
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:'0.12em', color:C.textMuted, textTransform:'uppercase', padding:'14px 0 8px' }}>
          Configuración
        </div>

        {/* Gmail sync row (expandable) */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, marginBottom:8 }}>
          <div onClick={() => setExpandedGmail(v => !v)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 13px', cursor:'pointer' }}>
            <div style={{ width:32, height:32, borderRadius:8, background: gmailConnected ? 'rgba(0,229,160,0.1)' : C.surfaceMid, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>✉️</div>
            <div style={{ flex:1, minWidth:0 }}>
              <span style={{ fontSize:12, fontWeight:500, color:C.text, fontFamily:"'DM Sans',sans-serif" }}>Sincronización Gmail</span>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color: gmailConnected ? C.accent : C.textMuted, display:'block', marginTop:1 }}>
                {gmailConnected ? `Conectado · ${gmailEmail}` : 'No conectado'}
              </span>
            </div>
            <span style={{ color:C.textMuted, fontSize:10, display:'inline-block', transform: expandedGmail ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>▼</span>
          </div>
          {expandedGmail && (
            <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 13px', display:'flex', flexDirection:'column', gap:12 }}>
              {!gmailConnected ? (
                <>
                  <div style={{ color:C.textSec, fontSize:12, lineHeight:1.7, fontFamily:"'DM Sans',sans-serif" }}>
                    ORIA lee los correos de alerta de <strong style={{color:C.text}}>Bancolombia</strong>, <strong style={{color:C.text}}>Davivienda</strong> y <strong style={{color:C.text}}>Nequi</strong> y registra tus movimientos automáticamente. Solo lectura — ORIA nunca modifica tu correo.
                  </div>
                  {gmailError && (
                    <div style={{ background:'rgba(239,68,68,0.1)', border:`1px solid rgba(239,68,68,0.3)`, borderRadius:10, padding:'10px 14px', color:C.danger, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
                      ⚠️ {gmailError}
                    </div>
                  )}
                  <button onClick={connectGmail} disabled={gmailLoading}
                    style={{ width:'100%', padding:'13px 0', borderRadius:12, border:'none', cursor: gmailLoading ? 'default' : 'pointer',
                      background: gmailLoading ? C.surface : 'linear-gradient(135deg,#00E5A0,#00B87A)',
                      color:'#0A0C0F', fontSize:14, fontWeight:700, opacity: gmailLoading ? 0.7 : 1, fontFamily:"'DM Sans',sans-serif" }}>
                    {gmailLoading ? '⏳ Esperando autorización…' : '🔗 Conectar Gmail'}
                  </button>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <span style={{ color:C.accent, fontSize:12, marginTop:1 }}>🔒</span>
                    <div style={{ color:C.textMuted, fontSize:11, lineHeight:1.6, fontFamily:"'DM Sans',sans-serif" }}>
                      Usa OAuth 2.0 seguro. ORIA nunca almacena tu contraseña. Puedes revocar el acceso en cualquier momento desde tu cuenta Google.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background:'rgba(0,229,160,0.1)', borderRadius:10, padding:'10px 14px', color:C.accent, fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                    {gmailCount} movimiento{gmailCount !== 1 ? 's' : ''} importado{gmailCount !== 1 ? 's' : ''} automáticamente
                  </div>
                  {lastSync && (
                    <div style={{ color:C.textMuted, fontSize:11, textAlign:'center', fontFamily:"'DM Sans',sans-serif" }}>
                      Última sync: {lastSync}
                    </div>
                  )}
                  {accounts.length === 0 && (
                    <div style={{ background:'rgba(245,166,35,0.1)', border:'1px solid rgba(245,166,35,0.3)', borderRadius:10, padding:'10px 14px', color:'#F5A623', fontSize:12, textAlign:'center', fontFamily:"'DM Sans',sans-serif" }}>
                      Registra al menos una cuenta bancaria para activar la sincronización
                    </div>
                  )}
                  <button onClick={syncNow} disabled={syncing || accounts.length === 0}
                    style={{ width:'100%', padding:'12px 0', borderRadius:12, border:'none',
                      cursor: (syncing || accounts.length === 0) ? 'default' : 'pointer',
                      background: (syncing || accounts.length === 0) ? C.surface : 'rgba(0,229,160,0.1)',
                      color: accounts.length === 0 ? C.textMuted : C.accent,
                      fontSize:13, fontWeight:700, opacity: (syncing || accounts.length === 0) ? 0.5 : 1, fontFamily:"'DM Sans',sans-serif" }}>
                    {syncing ? '⏳ Sincronizando…' : '🔄 Sincronizar ahora'}
                  </button>
                  <button onClick={cleanAndResync} disabled={syncing || accounts.length === 0}
                    style={{ width:'100%', padding:'10px 0', borderRadius:12, border:`1px solid rgba(239,68,68,0.3)`,
                      cursor: (syncing || accounts.length === 0) ? 'default' : 'pointer',
                      background:'rgba(239,68,68,0.07)', color:'#f87171', fontSize:12, fontWeight:600,
                      opacity: (syncing || accounts.length === 0) ? 0.4 : 1, fontFamily:"'DM Sans',sans-serif" }}>
                    🗑 Limpiar y re-sincronizar desde cero
                  </button>
                  <div style={{ color:C.textMuted, fontSize:11, textAlign:'center', lineHeight:1.5, fontFamily:"'DM Sans',sans-serif" }}>
                    ORIA sincroniza automáticamente cada 2 horas y al abrir la app.
                  </div>
                  <button onClick={runDiagnostic} disabled={diagRunning}
                    style={{ width:'100%', padding:'10px 0', borderRadius:12, border:`1px solid ${C.border}`, cursor: diagRunning ? 'default' : 'pointer',
                      background:'transparent', color:C.textMuted, fontSize:12, fontWeight:600, opacity: diagRunning ? 0.6 : 1, fontFamily:"'DM Sans',sans-serif" }}>
                    {diagRunning ? '⏳ Analizando correos…' : '🔍 Diagnóstico de correos'}
                  </button>
                  {diagResult && (
                    <div style={{ background:C.background, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px', maxHeight:320, overflowY:'auto' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <span style={{ color:C.textMuted, fontSize:10, fontWeight:700, letterSpacing:1, fontFamily:"'DM Mono',monospace" }}>DIAGNÓSTICO</span>
                        <button onClick={() => setDiagResult(null)} style={{ background:'none', border:'none', color:C.textMuted, fontSize:16, cursor:'pointer', padding:0 }}>✕</button>
                      </div>
                      <pre style={{ color:C.textSec, fontSize:10, lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0, fontFamily:'monospace' }}>
                        {diagResult}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div style={{ marginBottom:8 }}>
          <NotificationCard />
        </div>

        {/* CSV row (expandable) */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, marginBottom:8 }}>
          <div onClick={() => setExpandedCsv(v => !v)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 13px', cursor:'pointer' }}>
            <div style={{ width:32, height:32, borderRadius:8, background:C.surfaceMid, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>📂</div>
            <div style={{ flex:1, minWidth:0 }}>
              <span style={{ fontSize:12, fontWeight:500, color:C.text, fontFamily:"'DM Sans',sans-serif" }}>Importar extracto CSV</span>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:C.textMuted, display:'block', marginTop:1 }}>Sube un extracto de cualquier banco</span>
            </div>
            <span style={{ color:C.textMuted, fontSize:10, display:'inline-block', transform: expandedCsv ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>▼</span>
          </div>
          {expandedCsv && (
            <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 13px', display:'flex', flexDirection:'column', gap:12 }}>
              {/* Bank picker */}
              <div>
                <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>SELECCIONA TU BANCO</div>
                <button onClick={() => setBankDropOpen(o => !o)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 14px', cursor:'pointer', textAlign:'left', background:C.surfaceMid, border:`1px solid ${C.border}`, borderRadius:10 }}>
                  {bank ? (
                    <>
                      <BankLogo institution={bank.name} size={38} borderRadius={10} />
                      <span style={{ color:C.text, fontSize:14, fontWeight:600, flex:1, fontFamily:"'DM Sans',sans-serif" }}>{bank.name}</span>
                    </>
                  ) : (
                    <>
                      <div style={{ width:38, height:38, borderRadius:10, background:C.surfaceEl, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏦</div>
                      <span style={{ color:C.textMuted, fontSize:13, flex:1, fontFamily:"'DM Sans',sans-serif" }}>Selecciona tu banco…</span>
                    </>
                  )}
                  <span style={{ color:C.textMuted, fontSize:12, display:'inline-block', transform: bankDropOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>▼</span>
                </button>
                {bankDropOpen && (
                  <div style={{ marginTop:6, background:C.surfaceMid, border:`1px solid ${C.border}`, borderRadius:10, padding:12 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                      {BANKS.map(b => {
                        const sel = selectedBank === b.id;
                        return (
                          <button key={b.id}
                            onClick={() => { setSelectedBank(b.id); setBankDropOpen(false); setCsvStatus('idle'); setImported([]); }}
                            style={{ padding:'10px 4px', borderRadius:12, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                              border:`1px solid ${sel ? b.color+'88' : C.border}`, background: sel ? `${b.color}18` : C.surface }}>
                            <BankLogo institution={b.name} size={36} borderRadius={10} />
                            <span style={{ color: sel ? C.text : C.textMuted, fontSize:8, fontWeight:600, lineHeight:1.2, textAlign:'center', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as never, fontFamily:"'DM Sans',sans-serif" }}>
                              {b.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {bank && (
                <div style={{ background:C.surfaceMid, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ color:C.text, fontSize:13, fontWeight:700, marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>¿Cómo descargar el extracto?</div>
                  {bank.steps.map((step, i) => (
                    <div key={i} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
                      <div style={{ width:22, height:22, borderRadius:'50%', background:`${bank.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:bank.color, fontWeight:800, flexShrink:0 }}>{i+1}</div>
                      <div style={{ color:C.textSec, fontSize:12, lineHeight:1.5, fontFamily:"'DM Sans',sans-serif" }}>{step}</div>
                    </div>
                  ))}
                  <input ref={fileRef} type="file" accept=".csv,.txt,.xls,.xlsx" style={{ display:'none' }} onChange={handleFile} />
                  <button onClick={() => fileRef.current?.click()}
                    style={{ width:'100%', marginTop:12, padding:'13px 0', borderRadius:12, border:'none',
                      background:`linear-gradient(135deg,${bank.color},${bank.color}CC)`,
                      color: bank.id==='bancolombia'?'#1a1a1a':'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    📂 Subir extracto de {bank.name}
                  </button>
                </div>
              )}

              {csvStatus === 'error' && (
                <div style={{ background:'rgba(239,68,68,0.1)', border:`1px solid rgba(239,68,68,0.3)`, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ color:C.danger, fontSize:12, lineHeight:1.5, fontFamily:"'DM Sans',sans-serif" }}>⚠️ {csvError}</div>
                </div>
              )}

              {csvStatus === 'done' && imported.length > 0 && (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                    <div style={{ background:C.surfaceMid, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px', textAlign:'center' }}>
                      <div style={{ color:C.accent, fontSize:22, fontWeight:800, fontFamily:"'DM Sans',sans-serif" }}>{imported.length}</div>
                      <div style={{ color:C.textMuted, fontSize:11, marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>Movimientos</div>
                    </div>
                    <div style={{ background:C.surfaceMid, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px', textAlign:'center' }}>
                      <div style={{ color:C.accent, fontSize:22, fontWeight:800, fontFamily:"'DM Sans',sans-serif" }}>{[...new Set(imported.map(t => t.category))].length}</div>
                      <div style={{ color:C.textMuted, fontSize:11, marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>Categorías</div>
                    </div>
                  </div>
                  <div style={{ background:C.surfaceMid, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px' }}>
                    {imported.slice(0, 10).map((t, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
                        paddingBottom: i < Math.min(imported.length,10)-1 ? 12:0,
                        marginBottom:  i < Math.min(imported.length,10)-1 ? 12:0,
                        borderBottom:  i < Math.min(imported.length,10)-1 ? `1px solid ${C.border}` : 'none' }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:t.type==='income'?'rgba(0,229,160,0.12)':'rgba(239,68,68,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                          {t.type==='income'?'💰':'💳'}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ color:C.text, fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif" }}>{t.description}</div>
                          <div style={{ color:C.textMuted, fontSize:10, marginTop:1, fontFamily:"'DM Sans',sans-serif" }}>{t.category} · {t.date}</div>
                        </div>
                        <div style={{ color:t.type==='income'?C.accent:C.text, fontSize:12, fontWeight:700, flexShrink:0, fontFamily:"'DM Sans',sans-serif" }}>
                          {t.type==='income'?'+':'-'}{fmt(t.amount)}
                        </div>
                      </div>
                    ))}
                    {imported.length > 10 && (
                      <div style={{ color:C.textMuted, fontSize:11, textAlign:'center', marginTop:10, fontFamily:"'DM Sans',sans-serif" }}>
                        +{imported.length - 10} movimientos más
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setImported([]); setCsvStatus('idle'); }}
                    style={{ width:'100%', marginTop:10, padding:'12px 0', borderRadius:12, border:`1px solid ${C.border}`, background:'transparent', color:C.textSec, fontSize:13, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    Importar otro extracto
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TRM card — only when has USD credit cards */}
        {accounts.some(a => a.account_type === 'credit_card' && ((a.credit_limit_usd ?? 0) > 0 || (a.initial_balance_usd ?? 0) > 0)) && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'14px 13px', marginBottom:8 }}>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:700, letterSpacing:0.5, marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>
              💱 TASA DE CAMBIO (TRM)
            </div>
            <div style={{ color:C.textSec, fontSize:12, lineHeight:1.5, marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>
              Usada para convertir tus saldos en USD a COP y calcular la ocupación real de tus tarjetas.
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ position:'relative', flex:1 }}>
                <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.textMuted, fontSize:12, fontWeight:600 }}>$</span>
                <input type="text" inputMode="numeric"
                  value={parseFloat(trm) ? Number(trm).toLocaleString('es-CO') : ''}
                  placeholder="4.200"
                  onChange={e => setTrm(e.target.value.replace(/\D/g,''))}
                  style={{ width:'100%', paddingLeft:24, paddingRight:10, paddingTop:9, paddingBottom:9, borderRadius:10, border:`1px solid ${C.border}`, background:C.surfaceMid, color:C.text, fontSize:14, fontWeight:600, boxSizing:'border-box', outline:'none' }}
                />
              </div>
              <span style={{ color:C.textMuted, fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>COP / USD</span>
              <button onClick={() => { localStorage.setItem('nexo_trm', trm); }}
                style={{ padding:'9px 14px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#00E5A0,#00B87A)', color:'#0A0C0F', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0, fontFamily:"'DM Sans',sans-serif" }}>
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* UpdateButton */}
        <div style={{ marginBottom:8 }}>
          <UpdateButton />
        </div>

        {/* Borrar todo */}
        <button
          onClick={async () => {
            const ok = window.confirm(
              '⚠️ Reinicio completo\n\n' +
              'Esto va a borrar:\n' +
              '• Todos los movimientos\n' +
              '• Todas las cuentas y tarjetas\n' +
              '• La conexión de Gmail\n\n' +
              'Después deberás crear tus cuentas de nuevo y reconectar Gmail.\n' +
              'El momento 0 será la fecha en que crees las nuevas cuentas.\n\n' +
              '¿Continuar? Esta acción no se puede deshacer.'
            );
            if (!ok) return;
            await Promise.all([
              supabase.from('transactions').delete().eq('user_id', userId),
              supabase.from('monthly_summaries').delete().eq('user_id', userId),
              supabase.from('email_connections').delete().eq('user_id', userId),
            ]);
            await supabase.from('accounts').delete().eq('user_id', userId);
            localStorage.removeItem('nexo_gmail_connected');
            localStorage.removeItem('nexo_gmail_email');
            window.location.reload();
          }}
          style={{ width:'100%', marginBottom:8, padding:'14px 0', borderRadius:14, border:`1px solid rgba(239,68,68,0.2)`, background:'transparent', color:C.textMuted, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          🗑️ Borrar todo y empezar desde cero
        </button>

        {/* Cerrar sesión */}
        <button
          onClick={() => { localStorage.removeItem('nexo_gmail_connected'); localStorage.removeItem('nexo_gmail_email'); supabase.auth.signOut(); }}
          style={{ width:'100%', marginBottom:8, padding:'14px 0', borderRadius:14, border:`1px solid rgba(239,68,68,0.3)`, background:'rgba(239,68,68,0.07)', color:C.danger, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          Cerrar sesión
        </button>

      </div>
    </div>
  );
}

function UpdateButton() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'latest' | 'updating'>('idle');

  async function checkNow() {
    setStatus('checking');
    try {
      const res = await fetch('/version.json?_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('network');
      const { v } = await res.json() as { v: number };
      const stored = localStorage.getItem('oria_deployed_v');
      if (stored && stored !== String(v)) {
        localStorage.setItem('oria_deployed_v', String(v));
        setStatus('updating');
        setTimeout(() => window.location.reload(), 800);
      } else {
        localStorage.setItem('oria_deployed_v', String(v));
        setStatus('latest');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch {
      setStatus('idle');
    }
  }

  const label =
    status === 'checking' ? '⏳ Verificando…'  :
    status === 'latest'   ? '✅ Ya tienes la última versión' :
    status === 'updating' ? '✨ Aplicando actualización…'   :
    '🔄 Verificar actualizaciones';

  return (
    <button
      onClick={checkNow}
      disabled={status !== 'idle'}
      style={{ width:'100%', padding:'14px 0', borderRadius:14,
        border:'1px solid rgba(0,229,160,0.25)', background:'rgba(0,229,160,0.05)',
        color: status === 'latest' ? C.accent : C.info,
        fontSize:14, fontWeight:600, cursor: status === 'idle' ? 'pointer' : 'default' }}>
      {label}
    </button>
  );
}
