import { Injectable, Inject, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.module';

export type AuditAction =
  | 'auth.register'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.password_reset'
  | 'transaction.create'
  | 'transaction.update'
  | 'transaction.delete'
  | 'account.create'
  | 'account.update'
  | 'account.delete'
  | 'goal.create'
  | 'goal.update'
  | 'goal.delete'
  | 'admin.action';

export interface AuditParams {
  userId: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async log(params: AuditParams): Promise<void> {
    const { error } = await this.supabase.from('audit_log').insert({
      user_id:       params.userId,
      action:        params.action,
      resource_type: params.resourceType,
      resource_id:   params.resourceId,
      ip_address:    params.ipAddress,
      user_agent:    params.userAgent,
      metadata:      params.metadata,
    });

    if (error) {
      // Audit failures must not break the request — log internally only
      this.logger.error(`Audit log failed for action ${params.action}: ${error.message}`);
    }
  }
}
