import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(userId: string, id: string) {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error || !data) throw new NotFoundException('Account not found');
    return data;
  }

  async create(userId: string, dto: CreateAccountDto) {
    const { data, error } = await this.supabase
      .from('accounts')
      .insert({ ...dto, user_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    await this.findOne(userId, id);
    const { data, error } = await this.supabase
      .from('accounts')
      .update(dto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.supabase.from('accounts').update({ is_active: false }).eq('id', id).eq('user_id', userId);
    return { message: 'Account deactivated' };
  }

  async getBalance(userId: string) {
    const { data } = await this.supabase.from('accounts').select('current_balance, account_type, currency_code').eq('user_id', userId).eq('is_active', true);
    const total = (data || []).reduce((s, a) => s + Number(a.current_balance), 0);
    return { total_balance: total, accounts: data };
  }
}
