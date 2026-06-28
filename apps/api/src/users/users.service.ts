import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';
import { UpdateProfileDto } from './dto/update-profile.dto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getProfile(userId: string) {
    const { data } = await this.supabase.from('profiles').select('*').eq('id', userId).single();
    return data;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { data, error } = await this.supabase.from('profiles').update(dto).eq('id', userId).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async completeOnboarding(userId: string) {
    const { data } = await this.supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId).select().single();
    return data;
  }

  async getCategories(userId: string) {
    // userId comes from the verified JWT, but assert UUID shape before
    // interpolating into a PostgREST .or() filter string — defense in depth
    // against ever interpolating untrusted input into filter syntax.
    if (!UUID_RE.test(userId)) throw new BadRequestException('Invalid user id');
    const { data } = await this.supabase.from('categories').select('*').or(`user_id.eq.${userId},is_system.eq.true`).order('name');
    return data || [];
  }
}
