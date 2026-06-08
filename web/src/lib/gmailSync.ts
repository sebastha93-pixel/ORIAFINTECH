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
  const registeredAccounts = accounts.filter(a => a.account_suffix);
  if (registeredAccounts.length === 0) return { created: 0, emailCount: 0 };

  const headers = await getAuthHeaders();
  const res = await fetch(`${API}/email-sync/fetch-emails`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const emails = await res.json() as {
    messageId: string; bank: string; subject: string; body: string; date: string;
  }[];

  type ParsedItem = ReturnType<typeof parseEmail> & {
    messageId: string; date: string; account_id?: string;
  };
  const parsed: NonNullable<ParsedItem>[] = [];

  for (const email of emails) {
    const result = parseEmail(email.bank, email.body, email.subject);
    if (!result || result.amount <= 0) continue;
    if (!result.accountSuffix && email.bank !== 'nequi') continue;

    const match = registeredAccounts.find(a => {
      if (email.bank === 'nequi') return a.institution?.toLowerCase().includes('nequi');
      if (a.account_suffix !== result.accountSuffix) return false;
      return !!a.institution?.toLowerCase().includes(email.bank);
    });

    if (!match) continue;

    if (match.account_holder && result.accountHolder) {
      if (!holderNamesMatch(match.account_holder, result.accountHolder)) continue;
    }

    if (!match.initial_balance_set_at) continue;
    if (email.date < match.initial_balance_set_at) continue;

    parsed.push({ ...result, messageId: email.messageId, date: email.date, account_id: match.id });
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
    if (!error) created++;
  }

  return { created, emailCount: emails.length };
}
