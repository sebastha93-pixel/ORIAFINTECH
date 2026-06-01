const CLIENT_ID    = '666605907841-ftgh9fqkk44qn4kbm67foppn3683mtib.apps.googleusercontent.com';
const SCOPES       = 'https://www.googleapis.com/auth/gmail.readonly';
const REDIRECT_URI = 'http://localhost:5173';
const TOKEN_KEY    = 'nexo_gmail_token';
const EMAIL_KEY    = 'nexo_gmail_email';

export interface ParsedTransaction {
  amount:      number;
  type:        'income' | 'expense';
  description: string;
  category:    string;
  date:        string;
  merchant:    string;
  bank:        string;
}

// ── OAuth ────────────────────────────────────────────────────────────────────

export function startGmailAuth() {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'token',
    scope:         SCOPES,
  });
  window.location.href = `https://accounts.google.com/o/oauth2/auth?${params}`;
}

export function handleOAuthCallback(): string | null {
  const hash   = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token  = params.get('access_token');
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    window.location.hash = '';
  }
  return token;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function disconnectGmail() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

// ── Gmail API ─────────────────────────────────────────────────────────────────

async function gmailFetch(path: string, token: string) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
  return res.json();
}

async function getUserEmail(token: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json() as { email: string };
  return data.email;
}

function decodeBody(payload: GmailPayload): string {
  const tryDecode = (data: string) =>
    atob(data.replace(/-/g, '+').replace(/_/g, '/'));

  if (payload.body?.data) return tryDecode(payload.body.data);

  const parts = payload.parts ?? [];
  for (const p of parts) {
    if (p.mimeType === 'text/plain' && p.body?.data) return tryDecode(p.body.data);
  }
  for (const p of parts) {
    if (p.mimeType === 'text/html' && p.body?.data) {
      const html = tryDecode(p.body.data);
      return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    }
  }
  return '';
}

interface GmailPayload {
  body?:  { data?: string };
  parts?: GmailPayload[];
  mimeType?: string;
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseCOPAmount(raw: string): number {
  return parseInt(raw.replace(/\./g, '').replace(/,/g, ''), 10);
}

function guessCategory(merchant: string, type: 'income' | 'expense'): string {
  if (type === 'income') {
    if (/nómin|salari/i.test(merchant)) return 'Salario';
    if (/freelanc|honorari/i.test(merchant)) return 'Freelance';
    return 'Ingresos';
  }
  const m = merchant.toLowerCase();
  if (/éxito|carulla|jumbo|d1|ara|supermercado|mercado|alkosto/i.test(m)) return 'Alimentación';
  if (/uber|taxi|didi|cabify|sitp|transporte/i.test(m)) return 'Transporte';
  if (/netflix|spotify|disney|hbo|prime|entretenimiento|cine/i.test(m)) return 'Entretenimiento';
  if (/farmacia|droguería|cruz verde|colsubsidio|salud|clínica|médic/i.test(m)) return 'Salud';
  if (/arriendo|renta|vivienda|inmobili/i.test(m)) return 'Vivienda';
  if (/gym|bodytech|smartfit|deporte|fitness/i.test(m)) return 'Deporte';
  return 'Otros';
}

function parseBancolombia(body: string, subject: string): ParsedTransaction | null {
  // Compra: "Compra aprobada por $320.000 en Éxito"
  let m = body.match(/[Cc]ompra\s+aprobada\s+por\s+\$?([\d.]+)\s+en\s+([^\n.]+)/);
  if (m) {
    const merchant = m[2].trim();
    return { amount: parseCOPAmount(m[1]), type: 'expense', description: `Compra en ${merchant}`, category: guessCategory(merchant, 'expense'), date: new Date().toISOString().slice(0,10), merchant, bank: 'Bancolombia' };
  }
  // Nómina: "Pago de nómina por $5.800.000"
  m = body.match(/[Pp]ago\s+de\s+nómin[a-z]*\s+(?:por\s+)?\$?([\d.]+)/);
  if (m) {
    return { amount: parseCOPAmount(m[1]), type: 'income', description: 'Nómina', category: 'Salario', date: new Date().toISOString().slice(0,10), merchant: 'Nómina', bank: 'Bancolombia' };
  }
  // Transferencia recibida
  m = body.match(/[Tt]ransferencia\s+recibida\s+(?:por\s+)?\$?([\d.]+)/);
  if (m) {
    return { amount: parseCOPAmount(m[1]), type: 'income', description: 'Transferencia recibida', category: 'Ingresos', date: new Date().toISOString().slice(0,10), merchant: 'Transferencia', bank: 'Bancolombia' };
  }
  // Retiro cajero
  m = body.match(/[Rr]etiro\s+(?:en\s+cajero\s+)?(?:por\s+)?\$?([\d.]+)/);
  if (m) {
    return { amount: parseCOPAmount(m[1]), type: 'expense', description: 'Retiro cajero', category: 'Efectivo', date: new Date().toISOString().slice(0,10), merchant: 'Cajero', bank: 'Bancolombia' };
  }
  // Pago de servicios
  m = body.match(/[Pp]ago\s+de\s+servicios?\s+\$?([\d.]+)\s+a\s+([^\n.]+)/);
  if (m) {
    const merchant = m[2].trim();
    return { amount: parseCOPAmount(m[1]), type: 'expense', description: `Pago a ${merchant}`, category: guessCategory(merchant, 'expense'), date: new Date().toISOString().slice(0,10), merchant, bank: 'Bancolombia' };
  }
  return null;
}

function parseDavivienda(body: string): ParsedTransaction | null {
  // "Se realizó un débito de $45.000 en UBER"
  let m = body.match(/débito\s+de\s+\$?([\d.]+)\s+en\s+([^\n.]+)/i);
  if (m) {
    const merchant = m[2].trim();
    return { amount: parseCOPAmount(m[1]), type: 'expense', description: `Pago en ${merchant}`, category: guessCategory(merchant, 'expense'), date: new Date().toISOString().slice(0,10), merchant, bank: 'Davivienda' };
  }
  // "Crédito por $X"
  m = body.match(/crédito\s+por\s+\$?([\d.]+)/i);
  if (m) {
    return { amount: parseCOPAmount(m[1]), type: 'income', description: 'Crédito Davivienda', category: 'Ingresos', date: new Date().toISOString().slice(0,10), merchant: 'Davivienda', bank: 'Davivienda' };
  }
  return null;
}

function parseNequi(body: string): ParsedTransaction | null {
  // "Enviaste $89.000 a Nombre"
  let m = body.match(/[Ee]nviaste\s+\$?([\d.]+)\s+a\s+([^\n.]+)/);
  if (m) {
    const merchant = m[2].trim();
    return { amount: parseCOPAmount(m[1]), type: 'expense', description: `Envío a ${merchant}`, category: guessCategory(merchant, 'expense'), date: new Date().toISOString().slice(0,10), merchant, bank: 'Nequi' };
  }
  // "Recibiste $X de Nombre"
  m = body.match(/[Rr]ecibiste\s+\$?([\d.]+)\s+de\s+([^\n.]+)/);
  if (m) {
    const merchant = m[2].trim();
    return { amount: parseCOPAmount(m[1]), type: 'income', description: `Recibido de ${merchant}`, category: 'Ingresos', date: new Date().toISOString().slice(0,10), merchant, bank: 'Nequi' };
  }
  return null;
}

function parseEmail(from: string, subject: string, body: string): ParsedTransaction | null {
  if (/bancolombia/i.test(from)) return parseBancolombia(body, subject);
  if (/davivienda/i.test(from))  return parseDavivienda(body);
  if (/nequi/i.test(from))       return parseNequi(body);
  return null;
}

// ── Main sync function ────────────────────────────────────────────────────────

export interface SyncResult {
  emailsScanned:        number;
  transactionsCreated:  number;
  transactions:         ParsedTransaction[];
  gmailAddress:         string;
}

export async function syncGmailTransactions(token: string): Promise<SyncResult> {
  const gmailAddress = await getUserEmail(token);
  localStorage.setItem(EMAIL_KEY, gmailAddress);

  const query = [
    'from:(alertas@notificaciones.bancolombia.com',
    'OR notificaciones@davivienda.com',
    'OR info@nequi.com',
    'OR alertas@bancolombia.com)',
    'newer_than:30d',
  ].join(' ');

  const listData = await gmailFetch(
    `/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
    token,
  ) as { messages?: { id: string }[] };

  const messages = listData.messages ?? [];
  const transactions: ParsedTransaction[] = [];

  for (const msg of messages) {
    try {
      const full = await gmailFetch(`/users/me/messages/${msg.id}?format=full`, token) as {
        payload: GmailPayload & { headers?: { name: string; value: string }[] };
      };
      const headers = full.payload.headers ?? [];
      const from    = headers.find(h => h.name === 'From')?.value ?? '';
      const subject = headers.find(h => h.name === 'Subject')?.value ?? '';
      const body    = decodeBody(full.payload);
      const tx      = parseEmail(from, subject, body);
      if (tx) transactions.push(tx);
    } catch {
      // skip unparseable messages
    }
  }

  return {
    emailsScanned:       messages.length,
    transactionsCreated: transactions.length,
    transactions,
    gmailAddress,
  };
}
