import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getDashboard(userId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
    const dateTo = new Date(year, month, 0).toISOString().split('T')[0];

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevDateFrom = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const prevDateTo = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0];

    const [
      accountsRes,
      currentTransRes,
      prevTransRes,
      assetsRes,
      liabilitiesRes,
      goalsRes,
      insightsRes,
      netWorthHistoryRes,
      recentTransRes,
    ] = await Promise.all([
      this.supabase.from('accounts').select('*').eq('user_id', userId).eq('is_active', true),
      this.supabase.from('transactions').select('amount, transaction_type, category_id, category:categories(name, icon, color)').eq('user_id', userId).gte('date', dateFrom).lte('date', dateTo),
      this.supabase.from('transactions').select('amount, transaction_type').eq('user_id', userId).gte('date', prevDateFrom).lte('date', prevDateTo),
      this.supabase.from('assets').select('*').eq('user_id', userId).eq('is_active', true),
      this.supabase.from('liabilities').select('*').eq('user_id', userId).eq('is_active', true),
      this.supabase.from('goals').select('*').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(3),
      this.supabase.from('ai_insights').select('*').eq('user_id', userId).eq('is_dismissed', false).eq('is_read', false).order('generated_at', { ascending: false }).limit(5),
      this.supabase.from('net_worth_snapshots').select('*').eq('user_id', userId).order('snapshot_date', { ascending: false }).limit(12),
      this.supabase.from('transactions').select('*, account:accounts(name, icon, color), category:categories(name, icon, color)').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(5),
    ]);

    const currentTrans = currentTransRes.data || [];
    const prevTrans = prevTransRes.data || [];
    const accounts = accountsRes.data || [];
    const assets = assetsRes.data || [];
    const liabilities = liabilitiesRes.data || [];

    // Calculate metrics
    const monthlyIncome = currentTrans.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const monthlyExpenses = currentTrans.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const prevIncome = prevTrans.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const prevExpenses = prevTrans.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    const totalAssets = assets.reduce((s, a) => s + Number(a.current_value), 0) +
      accounts.filter(a => Number(a.current_balance) > 0).reduce((s, a) => s + Number(a.current_balance), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.current_balance), 0) +
      accounts.filter(a => Number(a.current_balance) < 0).reduce((s, a) => s + Math.abs(Number(a.current_balance)), 0);
    const netWorth = totalAssets - totalLiabilities;

    // Save snapshot
    await this.saveNetWorthSnapshot(userId, totalAssets, totalLiabilities, accounts);

    // Category spending breakdown
    const categorySpending = this.computeCategorySpending(currentTrans.filter(t => t.transaction_type === 'expense'), monthlyExpenses);

    // Goals with progress
    const goalsWithProgress = (goalsRes.data || []).map(g => ({
      ...g,
      progress_percentage: g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0,
      months_to_goal: this.calculateMonthsToGoal(g),
    }));

    const prevNetWorth = (netWorthHistoryRes.data || [])[1]?.net_worth || 0;

    return {
      net_worth: netWorth,
      net_worth_change: netWorth - Number(prevNetWorth),
      net_worth_change_percentage: prevNetWorth > 0 ? ((netWorth - Number(prevNetWorth)) / Math.abs(Number(prevNetWorth))) * 100 : 0,
      monthly_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
      monthly_savings: monthlyIncome - monthlyExpenses,
      savings_rate: monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0,
      vs_previous_month: {
        income_change_pct: prevIncome > 0 ? ((monthlyIncome - prevIncome) / prevIncome) * 100 : 0,
        expense_change_pct: prevExpenses > 0 ? ((monthlyExpenses - prevExpenses) / prevExpenses) * 100 : 0,
      },
      accounts,
      recent_transactions: recentTransRes.data || [],
      active_goals: goalsWithProgress,
      insights: insightsRes.data || [],
      spending_by_category: categorySpending,
      net_worth_history: (netWorthHistoryRes.data || []).reverse(),
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
    };
  }

  private computeCategorySpending(
    expenses: Array<{ amount: number; category_id: string | null; category: { name: string; icon: string; color: string } | null }>,
    total: number,
  ) {
    const byCategory = expenses.reduce((acc, t) => {
      const key = t.category_id || 'uncategorized';
      const cat = t.category as { name: string; icon: string; color: string } | null;
      if (!acc[key]) {
        acc[key] = {
          category_id: key,
          category_name: cat?.name || 'Sin categoría',
          category_icon: cat?.icon || 'tag',
          category_color: cat?.color || '#6B7280',
          amount: 0,
          transaction_count: 0,
        };
      }
      acc[key].amount += Number(t.amount);
      acc[key].transaction_count++;
      return acc;
    }, {} as Record<string, { category_id: string; category_name: string; category_icon: string; category_color: string; amount: number; transaction_count: number }>);

    return Object.values(byCategory)
      .map(c => ({ ...c, percentage: total > 0 ? (c.amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }

  private calculateMonthsToGoal(goal: { target_amount: number; current_amount: number; monthly_contribution: number | null; target_date: string | null }): number | null {
    if (!goal.monthly_contribution || goal.monthly_contribution <= 0) return null;
    const remaining = Number(goal.target_amount) - Number(goal.current_amount);
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / Number(goal.monthly_contribution));
  }

  private async saveNetWorthSnapshot(
    userId: string,
    totalAssets: number,
    totalLiabilities: number,
    accounts: Array<{ id: string; current_balance: number }>,
  ) {
    const today = new Date().toISOString().split('T')[0];
    const accountBalances = accounts.reduce((acc, a) => {
      acc[a.id] = Number(a.current_balance);
      return acc;
    }, {} as Record<string, number>);

    await this.supabase.from('net_worth_snapshots').upsert({
      user_id: userId,
      snapshot_date: today,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      account_balances: accountBalances,
    }, { onConflict: 'user_id,snapshot_date' });
  }
}
