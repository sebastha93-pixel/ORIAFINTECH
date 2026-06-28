import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): SupabaseClient => {
        const logger = new Logger('SupabaseModule');
        const serviceKey = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

        // The backend is designed around the service-role key (it bypasses RLS
        // and authorization is enforced in code by user_id scoping). Falling
        // back to the anon key silently would change the entire trust model, so
        // in production we fail loudly instead.
        if (!serviceKey) {
          if (configService.get<string>('NODE_ENV') === 'production') {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in production.');
          }
          logger.warn('SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key (RLS-limited). Dev only.');
        }

        const key = serviceKey ?? configService.getOrThrow<string>('SUPABASE_ANON_KEY');
        return createClient(
          configService.getOrThrow<string>('SUPABASE_URL'),
          key,
          { auth: { autoRefreshToken: false, persistSession: false } },
        );
      },
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}
