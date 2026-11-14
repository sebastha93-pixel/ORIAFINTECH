/**
 * Auditoría de seguridad 2026-11, informe 14 #26b.
 *
 * `signInWithPassword` sobre el cliente GLOBAL de service-role le dejaba
 * pegada la sesión del usuario: desde ese login, las consultas del resto de la
 * API viajaban con el token de esa persona y no con la service-role.
 *
 * Se prueba con el supabase-js REAL y un `fetch` falso que anota la cabecera
 * Authorization de cada petición. Correr: npm run test:sesion (en apps/api).
 */
import 'reflect-metadata';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from '../src/auth/auth.service';

const URL_SB = 'https://proyecto-de-prueba.supabase.co';
const SERVICE = 'llave-service-role-de-prueba';
const ANON = 'llave-publica-de-prueba';
const TOKEN_USUARIA = 'token-de-ana';

type Pedido = { url: string; auth: string | null };
function fetchFalso(pedidos: Pedido[]): typeof fetch {
  return (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada);
    const h = new Headers(init?.headers ?? (entrada instanceof Request ? entrada.headers : undefined));
    pedidos.push({ url, auth: h.get('Authorization') });
    if (url.includes('/auth/v1/token')) {
      const sesion = {
        access_token: TOKEN_USUARIA, refresh_token: 'refresco-de-ana', token_type: 'bearer',
        expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'u-ana', aud: 'authenticated', email: 'ana@x.co', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
      };
      return new Response(JSON.stringify(sesion), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.includes('/auth/v1/recover')) return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

function armar() {
  const pedidos: Pedido[] = [];
  const f = fetchFalso(pedidos);
  // Node 20 no trae WebSocket global y realtime-js lo exige al crear el cliente.
  // Esta prueba no usa realtime: basta un transporte vacío.
  class SinWebSocket {}
  const opciones = {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: f },
    realtime: { transport: SinWebSocket as never },
  };
  const global = createClient(URL_SB, SERVICE, opciones);
  let creados = 0;
  const fabrica = (): SupabaseClient => { creados += 1; return createClient(URL_SB, ANON, opciones); };
  const svc = new AuthService(global, fabrica);
  const authDeLaSiguienteConsulta = async () => {
    await global.from('accounts').select('id');
    const p = pedidos.filter((x) => x.url.includes('/rest/v1/accounts')).pop();
    return p?.auth ?? null;
  };
  return { svc, global, pedidos, authDeLaSiguienteConsulta, creados: () => creados };
}

test('después de un login, el cliente global sigue consultando como service-role', async () => {
  const { svc, authDeLaSiguienteConsulta } = armar();
  const r = await svc.login({ email: 'ana@x.co', password: 'clave-larga-1' } as never);
  assert.equal(r.session?.access_token, TOKEN_USUARIA);
  assert.equal(await authDeLaSiguienteConsulta(), `Bearer ${SERVICE}`);
});

test('después de renovar la sesión, también', async () => {
  const { svc, authDeLaSiguienteConsulta } = armar();
  const r = await svc.refreshToken('refresco-de-ana');
  assert.equal(r.session?.access_token, TOKEN_USUARIA);
  assert.equal(await authDeLaSiguienteConsulta(), `Bearer ${SERVICE}`);
});

test('cada login usa un cliente nuevo, con la llave pública', async () => {
  const { svc, pedidos, creados } = armar();
  await svc.login({ email: 'ana@x.co', password: 'clave-larga-1' } as never);
  await svc.login({ email: 'bea@x.co', password: 'clave-larga-2' } as never);
  assert.equal(creados(), 2);
  const logins = pedidos.filter((p) => p.url.includes('/auth/v1/token'));
  assert.equal(logins.length, 2);
  for (const p of logins) assert.equal(p.auth, `Bearer ${ANON}`);
});

test('recuperar la clave tampoco toca el cliente global', async () => {
  const { svc, pedidos, creados } = armar();
  await svc.resetPassword('ana@x.co');
  assert.equal(creados(), 1);
  const recover = pedidos.find((p) => p.url.includes('/auth/v1/recover'));
  assert.equal(recover?.auth, `Bearer ${ANON}`);
});
