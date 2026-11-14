import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';

/**
 * Fábrica de clientes EFÍMEROS para iniciar o renovar la sesión de un usuario
 * (auditoría de seguridad 2026-11, informe 14 #26b).
 *
 * `signInWithPassword` y `refreshSession` guardan la sesión en el cliente que
 * los llama, aunque sea con `persistSession: false` (queda en memoria). Se
 * hacían sobre el cliente GLOBAL de service-role: desde el primer login, toda
 * la API corría con el token de la última persona que entró, no con la
 * service-role. Un cliente nuevo por petición se descarta con su sesión.
 */
export const SUPABASE_SESION = 'SUPABASE_SESION';
export type FabricaSesion = () => SupabaseClient;

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
    {
      provide: SUPABASE_SESION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): FabricaSesion => {
        const url = configService.getOrThrow<string>('SUPABASE_URL');
        // Para iniciar sesión basta la llave pública: el cliente efímero no
        // necesita saltarse RLS.
        const key = configService.get<string>('SUPABASE_ANON_KEY')
          ?? configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
        return () => createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
      },
    },
  ],
  exports: [SUPABASE_CLIENT, SUPABASE_SESION],
})
export class SupabaseModule {}
