import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findAll(userId: string, filters: TransactionFiltersDto) {
    let query = this.supabase
      .from('transactions')
      .select(`
        *,
        account:accounts(id, name, institution, color, icon, account_type),
        category:categories(id, name, icon, color, category_type)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.account_id) query = query.eq('account_id', filters.account_id);
    if (filters.category_id) query = query.eq('category_id', filters.category_id);
    if (filters.transaction_type) query = query.eq('transaction_type', filters.transaction_type);
    if (filters.date_from) query = query.gte('date', filters.date_from);
    if (filters.date_to) query = query.lte('date', filters.date_to);
    if (filters.min_amount) query = query.gte('amount', filters.min_amount);
    if (filters.max_amount) query = query.lte('amount', filters.max_amount);
    if (filters.search) {
      query = query.ilike('description', `%${filters.search}%`);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return {
      data,
      meta: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select(`
        *,
        account:accounts(id, name, institution, color, icon, account_type),
        category:categories(id, name, icon, color, category_type)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new NotFoundException('Transaction not found');
    return data;
  }

  async create(userId: string, dto: CreateTransactionDto) {
    const { data, error } = await this.supabase
      .from('transactions')
      .insert({ ...dto, user_id: userId })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.findOne(userId, id);
    if (existing.user_id !== userId) throw new ForbiddenException();

    const { data, error } = await this.supabase
      .from('transactions')
      .update(dto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async remove(userId: string, id: string) {
    const existing = await this.findOne(userId, id);
    if (existing.user_id !== userId) throw new ForbiddenException();

    const { error } = await this.supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return { message: 'Transaction deleted' };
  }

  async getMonthlyStats(userId: string, year: number, month: number) {
    const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
    const dateTo = new Date(year, month, 0).toISOString().split('T')[0];

    const { data: transactions } = await this.supabase
      .from('transactions')
      .select('amount, transaction_type, category_id, category:categories(name, icon, color)')
      .eq('user_id', userId)
      .gte('date', dateFrom)
      .lte('date', dateTo);

    if (!transactions) return null;

    const income = transactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = transactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const categoryBreakdown = transactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((acc, t) => {
        const cat = (t.category as unknown as { name: string; icon: string; color: string } | null);
        const key = cat?.name || 'Sin categoría';
        acc[key] = (acc[key] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    return {
      year,
      month,
      total_income: income,
      total_expenses: expenses,
      net_savings: income - expenses,
      savings_rate: income > 0 ? (income - expenses) / income : 0,
      category_breakdown: categoryBreakdown,
      transaction_count: transactions.length,
    };
  }
}
