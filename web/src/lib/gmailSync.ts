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
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

export function holderNamesMatch(registered: string, fromEmail: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const reg = normalize(registered);
  const em  = normalize(fromEmail);
  if (reg.includes(em) || em.includes(reg)) return true;
  const regWords = reg.split(/\s+/).filter(w => w.length > 2);
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

  const emails = await res.json() as {
    messageId: string; bank: string; subject: string; body: string; date: string;
  }[];

  type ParsedItem = ReturnType<typeof parseEmail> & {
    messageId: string; date: string; account_id?: string;
  };
  const parsed: NonNullable<ParsedItem>[] = [];

  const registeredAccounts = accounts.filter(a => a.account_suffix);

  for (const email of emails) {
    const result = parseEmail(email.bank, email.body, email.subject);
    if (!result || result.amount <= 0) continue;

    // Try to match a registered account (best-effort — does NOT block import)
    let account_id: string | undefined;
    const matchedAccount = registeredAccounts.find(a => {
      if (email.bank === 'nequi') return !!a.institution?.toLowerCase().includes('nequi');
      if (!result.accountSuffix || a.account_suffix !== result.accountSuffix) return false;
      return !!a.institution?.toLowerCase().includes(email.bank);
    });

    if (matchedAccount) {
      // Holder check is a soft filter — only reject when both are present and clearly mismatched
      const holderOk =
        !matchedAccount.account_holder ||
        !result.accountHolder ||
        holderNamesMatch(matchedAccount.account_holder, result.accountHolder);
      if (holderOk) account_id = matchedAccount.id;
    }

    // Import the transaction regardless of whether a matching account was found.
    // Unlinked transactions still appear in Movimientos; they can be reviewed manually.
    parsed.push({ ...result, messageId: email.messageId, date: email.date, account_id });
  }

  let created = 0;
  for (const txn of parsed) {
    const { error } = await supabase.from('transactions').insert({
      user_id:          userId,
      transaction_type: txn.type,
      amount:           txn.amount,
      description:      txn.description,
      date:             txn.date.slice(0, 10),
      gmail_message_id: txn.messageId,
      currency_code:    'COP',
      notes:            'Auto-importado',
      ...(txn.account_id ? { account_id: txn.account_id } : {}),
    });
    // error code 23505 = duplicate key (already imported) — silently skip
    if (!error) created++;
  }

  return { created, emailCount: emails.length };
}
