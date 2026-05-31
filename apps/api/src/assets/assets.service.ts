import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';
import { CreateAssetDto } from './dto/create-asset.dto';
import { CreateLiabilityDto } from './dto/create-liability.dto';

@Injectable()
export class AssetsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getNetWorth(userId: string) {
    const [assetsRes, liabilitiesRes, accountsRes, historyRes] = await Promise.all([
      this.supabase.from('assets').select('*').eq('user_id', userId).eq('is_active', true),
      this.supabase.from('liabilities').select('*').eq('user_id', userId).eq('is_active', true),
      this.supabase.from('accounts').select('*').eq('user_id', userId).eq('is_active', true),
      this.supabase.from('net_worth_snapshots').select('*').eq('user_id', userId).order('snapshot_date', { ascending: false }).limit(12),
    ]);

    const assets = assetsRes.data || [];
    const liabilities = liabilitiesRes.data || [];
    const accounts = accountsRes.data || [];

    const totalAssets = assets.reduce((s, a) => s + Number(a.current_value), 0) +
      accounts.filter(a => Number(a.current_balance) > 0).reduce((s, a) => s + Number(a.current_balance), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.current_balance), 0) +
      accounts.filter(a => Number(a.current_balance) < 0).reduce((s, a) => s + Math.abs(Number(a.current_balance)), 0);

    return {
      net_worth: totalAssets - totalLiabilities,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      assets,
      liabilities,
      accounts,
      history: (historyRes.data || []).reverse(),
    };
  }

  // Assets CRUD
  async findAssets(userId: string) {
    const { data } = await this.supabase.from('assets').select('*').eq('user_id', userId).eq('is_active', true).order('current_value', { ascending: false });
    return data || [];
  }

  async createAsset(userId: string, dto: CreateAssetDto) {
    const { data, error } = await this.supabase.from('assets').insert({ ...dto, user_id: userId }).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateAsset(userId: string, id: string, dto: Partial<CreateAssetDto>) {
    const { data, error } = await this.supabase.from('assets').update(dto).eq('id', id).eq('user_id', userId).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteAsset(userId: string, id: string) {
    await this.supabase.from('assets').update({ is_active: false }).eq('id', id).eq('user_id', userId);
    return { message: 'Asset removed' };
  }

  // Liabilities CRUD
  async findLiabilities(userId: string) {
    const { data } = await this.supabase.from('liabilities').select('*').eq('user_id', userId).eq('is_active', true).order('current_balance', { ascending: false });
    return data || [];
  }

  async createLiability(userId: string, dto: CreateLiabilityDto) {
    const { data, error } = await this.supabase.from('liabilities').insert({ ...dto, user_id: userId }).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateLiability(userId: string, id: string, dto: Partial<CreateLiabilityDto>) {
    const { data, error } = await this.supabase.from('liabilities').update(dto).eq('id', id).eq('user_id', userId).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteLiability(userId: string, id: string) {
    await this.supabase.from('liabilities').update({ is_active: false }).eq('id', id).eq('user_id', userId);
    return { message: 'Liability removed' };
  }
}
