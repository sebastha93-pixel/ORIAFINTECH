import { Controller, Post, Headers, ForbiddenException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';

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
  // "X Bancolombia" → "X · Bancolombia"
  const inlineRe = new RegExp(`\\s+${cap}(\\s+\\*+\\d+)?$`);
  if (inlineRe.test(desc)) return desc.replace(inlineRe, (_, acct) => ` ${suffix}${acct ?? ''}`);

  return `${desc} ${suffix}`;
}

@Controller('admin')
export class AdminController {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly config: ConfigService,
  ) {}

  @Post('migrate-descriptions')
  async migrateDescriptions(@Headers('x-admin-secret') secret: string) {
    const expected = this.config.get<string>('ADMIN_SECRET');
    if (!expected || !secret) throw new ForbiddenException();
    // Timing-safe comparison prevents timing-based secret enumeration
    const match =
      secret.length === expected.length &&
      timingSafeEqual(Buffer.from(secret), Buffer.from(expected));
    if (!match) throw new ForbiddenException();

    const { data: txns, error } = await this.supabase
      .from('transactions')
      .select('id, description, notes')
      .not('gmail_message_id', 'is', null)
      .not('notes', 'is', null);

    if (error) return { ok: false, error: error.message };

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

      const { error: e } = await this.supabase
        .from('transactions')
        .update({ description: next })
        .eq('id', tx.id);

      if (e) { skipped++; continue; }
      updated++;
    }

    return { ok: true, updated, skipped, total: txns?.length ?? 0 };
  }
}
