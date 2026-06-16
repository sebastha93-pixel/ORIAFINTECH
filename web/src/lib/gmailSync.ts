import { supabase } from './supabase';
import { parseEmail } from './emailParsers';

const API = (import.meta.env.VITE_API_URL as string | undefined)
  ?? 'https://nexo-finanzas-tech-production.up.railway.app/api/v1';

export interface SyncAccount {
  id: string;
  institution: string | null;
  account_suffix: string | null;
  account_holder: string | null;
  initial_balance_set_at: string | null;
}

export interface SyncResult {
  created: number;
  emailCount: number;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('No active session — please log in again');
  return { Authorization: `Bearer ${session.access_token}` };
}

// Exported so SettingsScreen can reuse the same logic (single source of truth)
export function computeGlobalCutoff(accounts: Pick<SyncAccount, 'initial_balance_set_at'>[]): string | null {
  const dates = accounts
    .filter(a => a.initial_balance_set_at)
    .map(a => a.initial_balance_set_at!)
    .sort();
  return dates.length ? dates[dates.length - 1] : null;
}

// Use Date objects, not string comparison, to handle timezone-offset formats correctly
function beforeCutoff(emailTs: string, cutoff: string): boolean {
  return new Date(emailTs) < new Date(cutoff);
}

export function holderNamesMatch(registered: string, fromEmail: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const reg = normalize(registered);
  const em  = normalize(fromEmail);
  if (reg.includes(em) || em.includes(reg)) return true;
  // Require at least 4 chars to avoid false positives on common short tokens
  const regWords = reg.split(/\s+/).filter(w => w.length > 3);
  return regWords.some(w => em.includes(w));
}

export async function runGmailSync(
  userId: string,
  accounts: SyncAccount[],
): Promise<SyncResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API}/email-sync/fetch-emails`, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 401 || body.includes('token refresh failed') || body.includes('reconnect')) {
      localStorage.removeItem('nexo_gmail_connected');
      localStorage.removeItem('nexo_gmail_email');
      throw new Error('GMAIL_TOKEN_EXPIRED');
    }
    throw new Error(`HTTP ${res.status}`);
  }

  const raw = await res.json() as unknown;
  if (!Array.isArray(raw)) throw new Error('Respuesta inesperada del servidor de correo');
  const emails = (raw as { messageId: string; bank: string; subject: string; body: string; date: string }[])
    .filter(e => e && typeof e.messageId === 'string' && typeof e.bank === 'string');

  type ParsedItem = ReturnType<typeof parseEmail> & {
    messageId: string; date: string; account_id?: string;
  };
  const parsed: NonNullable<ParsedItem>[] = [];

  const registeredAccounts = accounts.filter(a => a.account_suffix);

  // Momento 0: timestamp exacto (fecha + hora) de creación de cada cuenta.
  // Global cutoff = most RECENT account creation (most conservative fallback).
  const globalCutoff = computeGlobalCutoff(accounts);

  for (const email of emails) {
    const result = parseEmail(email.bank, email.body, email.subject);
    if (!result || result.amount <= 0) continue;

    const emailTs = email.date;

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
        account_id = matchedAccount.id;
        const acctCutoff = matchedAccount.initial_balance_set_at;
        if (acctCutoff && beforeCutoff(emailTs, acctCutoff)) continue;
      } else {
        if (globalCutoff && beforeCutoff(emailTs, globalCutoff)) continue;
      }
    } else {
      if (globalCutoff && beforeCutoff(emailTs, globalCutoff)) continue;
    }

    parsed.push({ ...result, messageId: email.messageId, date: email.date, account_id });
  }

  let created = 0;
  for (const txn of parsed) {
    const { error } = await supabase.from('transactions').insert({
      user_id:          userId,
      transaction_type: txn.type,
      amount:           Math.min(txn.amount, 999_999_999_999),
      description:      txn.description,
      date:             txn.date.slice(0, 10),
      gmail_message_id: txn.messageId,
      currency_code:    'COP',
      notes:            [
        'Auto-importado',
        txn.recipientName   ? `Destinatario: ${txn.recipientName}` : null,
        txn.recipientSuffix ? `Cuenta destino: *${txn.recipientSuffix}` : null,
      ].filter(Boolean).join(' · '),
      ...(txn.account_id ? { account_id: txn.account_id } : {}),
    });
    if (!error) {
      created++;
    } else if (error.code !== '23505') {
      // 23505 = duplicate key (already imported) — silently skip; log the rest
      console.error('gmailSync insert error:', error.code, error.message);
    }
  }

  return { created, emailCount: emails.length };
}
