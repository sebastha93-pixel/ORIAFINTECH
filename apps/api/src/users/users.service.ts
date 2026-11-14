import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';
import { EmailSyncService } from '../email-sync/email-sync.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// User-owned tables, ordered children → parents so explicit deletes don't hit
// foreign-key constraints. Deleting the auth user afterwards cascades anything
// that has ON DELETE CASCADE, so this is defense-in-depth for full erasure.
const USER_DATA_TABLES = [
  'transactions',
  'goal_contributions',
  'net_worth_snapshots',
  'ai_conversations',
  'ai_insights',
  'monthly_summaries',
  'category_rules',
  'goals',
  'assets',
  'liabilities',
  'categories',
  'email_connections',
  'accounts',
];

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly emailSync: EmailSyncService,
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

  /**
   * Permanently delete the user's account and all associated data.
   * Required by Apple/Google Play for apps that support account creation.
   */
  async deleteAccount(userId: string) {
    if (!UUID_RE.test(userId)) throw new BadRequestException('Invalid user id');

    // Primero se le quita a Google el permiso sobre su Gmail: después de
    // borrar email_connections ya no queda el token para revocarlo
    // (auditoría 2026-11, #26d). Nunca bloquea el borrado.
    const google = await this.emailSync.revocarAccesoGoogle(userId).catch(() => 'fallo' as const);
    if (google !== 'sin_conexion') this.logger.log(`deleteAccount: acceso de Google → ${google}`);

    // Best-effort explicit erasure of all user-owned rows. For `categories`
    // only the user's own (non-system) rows are removed.
    for (const table of USER_DATA_TABLES) {
      const query = this.supabase.from(table).delete();
      const scoped = table === 'categories'
        ? query.eq('user_id', userId).eq('is_system', false)
        : query.eq('user_id', userId);
      const { error } = await scoped;
      if (error) this.logger.warn(`deleteAccount: ${table} → ${error.message}`);
    }

    // Remove the profile row, then the auth user (cascades any remaining refs).
    await this.supabase.from('profiles').delete().eq('id', userId);
    const { error } = await this.supabase.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    this.logger.log('Account permanently deleted for a user');
    return { message: 'Cuenta eliminada permanentemente' };
  }
}
