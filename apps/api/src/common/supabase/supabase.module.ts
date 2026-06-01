import { Module, Global } from '@nestjs/common';
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
        const key =
          configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ??
          configService.getOrThrow<string>('SUPABASE_ANON_KEY');
        return createClient(
          configService.getOrThrow<string>('SUPABASE_URL'),
          key,
        );
      },
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}
