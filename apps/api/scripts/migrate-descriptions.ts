import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function bankSuffix(bank: string): string {
  if (bank === 'bancolombia') return '· Bancolombia';
  if (bank === 'davivienda')  return '· Davivienda';
  if (bank === 'nequi')       return '· Nequi';
  return '';
}

function normalise(desc: string, bank: string): string {
  const suffix = bankSuffix(bank);
  if (!suffix || desc.includes(suffix)) return desc;

  const cap = bank.charAt(0).toUpperCase() + bank.slice(1);
  const inlineRe = new RegExp(`\\s+${cap}(\\s+\\*+\\d+)?$`);
  if (inlineRe.test(desc)) return desc.replace(inlineRe, (_, acct) => ` ${suffix}${acct ?? ''}`);

  return `${desc} ${suffix}`;
}

async function run() {
  console.log('Fetching imported transactions…');

  const { data: txns, error } = await supabase
    .from('transactions')
    .select('id, description, notes')
    .not('gmail_message_id', 'is', null)
    .not('notes', 'is', null);

  if (error) {
    console.error('Fetch error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${txns?.length ?? 0} imported transactions`);

  let updated = 0;
  let skipped = 0;

  for (const tx of txns ?? []) {
    const notesLower = ((tx.notes as string) ?? '').toLowerCase();
    let bank = '';
    if (notesLower.includes('desde bancolombia')) bank = 'bancolombia';
    else if (notesLower.includes('desde davivienda')) bank = 'davivienda';
    else if (notesLower.includes('desde nequi'))      bank = 'nequi';

    if (!bank) { skipped++; continue; }

    const current = (tx.description as string) ?? '';
    const next = normalise(current, bank);
    if (next === current) { skipped++; continue; }

    const { error: e } = await supabase
      .from('transactions')
      .update({ description: next })
      .eq('id', tx.id);

    if (e) { skipped++; continue; }
    console.log(`  ✓ "${current}"  →  "${next}"`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated} | Skipped: ${skipped}`);
}

run();
