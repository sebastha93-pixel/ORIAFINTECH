const CLIENT_ID = '666605907841-ftgh9fqkk44qn4kbm67foppn3683mtib.apps.googleusercontent.com';
const SCOPES    = 'https://www.googleapis.com/auth/gmail.readonly';
const TOKEN_KEY = 'nexo_gmail_token';
const EMAIL_KEY = 'nexo_gmail_email';

export interface ParsedTransaction {
  amount:      number;
  type:        'income' | 'expense';
  description: string;
  category:    string;
  date:        string;
  merchant:    string;
  bank:        string;
}

// ── Google Identity Services (popup — no redirect URI needed) ─────────────────

declare const google: {
  accounts: {
    oauth2: {
      initTokenClient(cfg: {
        client_id: string;
        scope: string;
        callback: (r: { access_token?: string; error?: string }) => void;
      }): { requestAccessToken(): void };
    };
  };
};

export function startGmailAuth(
  onSuccess: (token: string) => void,
  onError:   (err: string)   => void,
) {
  const client = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope:     SCOPES,
    callback:  (response) => {
      if (response.access_token) {
        localStorage.setItem(TOKEN_KEY, response.access_token);
        onSuccess(response.access_token);
      } else {
        onError(response.error ?? 'Auth cancelado');
      }
    },
  });
  client.requestAccessToken();
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
  const res  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json() as { email: string };
  return data.email;
}

interface GmailPayload {
  body?:     { data?: string };
  parts?:    GmailPayload[];
  mimeType?: string;
}

function decodeBody(payload: GmailPayload): string {
  const decode = (d: string) => atob(d.replace(/-/g, '+').replace(/_/g, '/'));
  if (payload.body?.data) return decode(payload.body.data);
  const parts = payload.parts ?? [];
  for (const p of parts) {
    if (p.mimeType === 'text/plain' && p.body?.data) return decode(p.body.data);
  }
  for (const p of parts) {
    if (p.mimeType === 'text/html' && p.body?.data) {
      return decode(p.body.data).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    }
  }
  return '';
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseCOP(raw: string): number {
  return parseInt(raw.replace(/\./g, '').replace(/,/g, ''), 10);
}

function category(merchant: string, type: 'income' | 'expense'): string {
  if (type === 'income') {
    if (/nómin|salari/i.test(merchant))    return 'Salario';
    if (/freelanc|honorari/i.test(merchant)) return 'Freelance';
    return 'Ingresos';
  }
  const m = merchant.toLowerCase();
  if (/éxito|carulla|jumbo|d1|ara|supermercado|alkosto/i.test(m)) return 'Alimentación';
  if (/uber|taxi|didi|cabify|sitp/i.test(m))                      return 'Transporte';
  if (/netflix|spotify|disney|hbo|prime|cine/i.test(m))           return 'Entretenimiento';
  if (/farmacia|droguería|cruz verde|salud|clínica|médic/i.test(m)) return 'Salud';
  if (/arriendo|renta|vivienda|inmobili/i.test(m))                return 'Vivienda';
  if (/gym|bodytech|smartfit|fitness/i.test(m))                   return 'Deporte';
  return 'Otros';
}

function tx(amount: number, type: 'income'|'expense', desc: string, merchant: string, bank: string): ParsedTransaction {
  return { amount, type, description: desc, category: category(merchant, type), date: new Date().toISOString().slice(0,10), merchant, bank };
}

function parseBancolombia(body: string): ParsedTransaction | null {
  let m = body.match(/[Cc]ompra\s+aprobada\s+por\s+\$?([\d.]+)\s+en\s+([^\n.]+)/);
  if (m) return tx(parseCOP(m[1]), 'expense', `Compra en ${m[2].trim()}`, m[2].trim(), 'Bancolombia');

  m = body.match(/[Pp]ago\s+de\s+nómin[a-z]*\s+(?:por\s+)?\$?([\d.]+)/);
  if (m) return tx(parseCOP(m[1]), 'income', 'Nómina', 'Nómina', 'Bancolombia');

  m = body.match(/[Tt]ransferencia\s+recibida\s+(?:por\s+)?\$?([\d.]+)/);
  if (m) return tx(parseCOP(m[1]), 'income', 'Transferencia recibida', 'Transferencia', 'Bancolombia');

  m = body.match(/[Rr]etiro\s+(?:en\s+cajero\s+)?(?:por\s+)?\$?([\d.]+)/);
  if (m) return tx(parseCOP(m[1]), 'expense', 'Retiro cajero', 'Cajero', 'Bancolombia');

  m = body.match(/[Pp]ago\s+de\s+servicios?\s+\$?([\d.]+)\s+a\s+([^\n.]+)/);
  if (m) return tx(parseCOP(m[1]), 'expense', `Pago a ${m[2].trim()}`, m[2].trim(), 'Bancolombia');

  return null;
}

function parseDavivienda(body: string): ParsedTransaction | null {
  let m = body.match(/débito\s+de\s+\$?([\d.]+)\s+en\s+([^\n.]+)/i);
  if (m) return tx(parseCOP(m[1]), 'expense', `Pago en ${m[2].trim()}`, m[2].trim(), 'Davivienda');

  m = body.match(/crédito\s+por\s+\$?([\d.]+)/i);
  if (m) return tx(parseCOP(m[1]), 'income', 'Crédito Davivienda', 'Davivienda', 'Davivienda');

  return null;
}

function parseNequi(body: string): ParsedTransaction | null {
  let m = body.match(/[Ee]nviaste\s+\$?([\d.]+)\s+a\s+([^\n.]+)/);
  if (m) return tx(parseCOP(m[1]), 'expense', `Envío a ${m[2].trim()}`, m[2].trim(), 'Nequi');

  m = body.match(/[Rr]ecibiste\s+\$?([\d.]+)\s+de\s+([^\n.]+)/);
  if (m) return tx(parseCOP(m[1]), 'income', `Recibido de ${m[2].trim()}`, m[2].trim(), 'Nequi');

  return null;
}

function parseEmail(from: string, body: string): ParsedTransaction | null {
  if (/bancolombia/i.test(from)) return parseBancolombia(body);
  if (/davivienda/i.test(from))  return parseDavivienda(body);
  if (/nequi/i.test(from))       return parseNequi(body);
  return null;
}

// ── Main sync ─────────────────────────────────────────────────────────────────

export interface SyncResult {
  emailsScanned:       number;
  transactionsCreated: number;
  transactions:        ParsedTransaction[];
  gmailAddress:        string;
}

export async function syncGmailTransactions(token: string): Promise<SyncResult> {
  const gmailAddress = await getUserEmail(token);
  localStorage.setItem(EMAIL_KEY, gmailAddress);

  const query = 'from:(alertas@notificaciones.bancolombia.com OR notificaciones@davivienda.com OR info@nequi.com OR alertas@bancolombia.com) newer_than:30d';

  const listData = await gmailFetch(
    `/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
    token,
  ) as { messages?: { id: string }[] };

  const messages     = listData.messages ?? [];
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
      const result  = parseEmail(from, body);
      if (result) transactions.push({ ...result, description: result.description || subject });
    } catch {
      // skip unparseable message
    }
  }

  return { emailsScanned: messages.length, transactionsCreated: transactions.length, transactions, gmailAddress };
}
