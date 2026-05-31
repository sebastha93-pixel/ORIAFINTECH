import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';

@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getProfile(userId: string) {
    const { data } = await this.supabase.from('profiles').select('*').eq('id', userId).single();
    return data;
  }

  async updateProfile(userId: string, dto: { full_name?: string; phone?: string; currency_code?: string; country_code?: string; notification_preferences?: object }) {
    const { data, error } = await this.supabase.from('profiles').update(dto).eq('id', userId).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async completeOnboarding(userId: string) {
    const { data } = await this.supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId).select().single();
    return data;
  }

  async getCategories(userId: string) {
    const { data } = await this.supabase.from('categories').select('*').or(`user_id.eq.${userId},is_system.eq.true`).order('name');
    return data || [];
  }
}
