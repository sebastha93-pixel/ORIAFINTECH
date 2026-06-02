import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';

@Injectable()
export class MonthlyCloseService {
  private readonly logger = new Logger(MonthlyCloseService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  // Runs at 23:58 on days 28-31; we verify inside if it's actually the last day
  @Cron('58 23 28-31 * *', { timeZone: 'America/Bogota' })
  async handleMonthlyClose() {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (now.getDate() !== lastDay) return;

    this.logger.log(`Running monthly close for ${now.getFullYear()}-${now.getMonth() + 1}`);
    await this.closeMonth(now.getFullYear(), now.getMonth() + 1);
  }

  async closeMonth(year: number, month: number): Promise<{ processed: number; errors: string[] }> {
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay  = new Date(year, month, 0).toISOString().slice(0, 10);
    const errors: string[] = [];

    // Get all users who have transactions
    const { data: users, error: usersErr } = await this.supabase
      .from('transactions')
      .select('user_id')
      .gte('date', firstDay)
      .lte('date', lastDay);

    if (usersErr || !users) {
      this.logger.error(`Failed to fetch users for close: ${usersErr?.message}`);
      return { processed: 0, errors: [usersErr?.message ?? 'Unknown error'] };
    }

    const uniqueUsers = [...new Set(users.map(r => r.user_id as string))];
    let processed = 0;

    for (const userId of uniqueUsers) {
      try {
        const { data: txns } = await this.supabase
          .from('transactions')
          .select('transaction_type, amount')
          .eq('user_id', userId)
          .gte('date', firstDay)
          .lte('date', lastDay);

        const totalIncome   = (txns ?? []).filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const totalExpenses = (txns ?? []).filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        const savingsRate   = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;

        const { error: upsertErr } = await this.supabase
          .from('monthly_summaries')
          .upsert({
            user_id:        userId,
            year,
            month,
            total_income:   totalIncome,
            total_expenses: totalExpenses,
            savings_rate:   savingsRate,
          }, { onConflict: 'user_id,year,month' });

        if (upsertErr) {
          errors.push(`user ${userId}: ${upsertErr.message}`);
        } else {
          processed++;
          this.logger.log(`Closed month ${year}-${month} for user ${userId}: income=${totalIncome}, expenses=${totalExpenses}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`user ${userId}: ${msg}`);
      }
    }

    return { processed, errors };
  }

  // Manual trigger endpoint for testing / backfill
  async closeMonthPublic(year: number, month: number) {
    return this.closeMonth(year, month);
  }
}
