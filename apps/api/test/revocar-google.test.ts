/**
 * Auditoría de seguridad 2026-11, informe 14 #26d: borrar la cuenta no revocaba
 * el permiso de Gmail en Google; solo borraba filas. Correr: npm run test:sesion.
 */
import 'reflect-metadata';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { EmailSyncService } from '../src/email-sync/email-sync.service';
import { UsersService } from '../src/users/users.service';

const USER = '6b1f2c7a-6f5a-4a0e-9a3f-2c1d8e4b7a90';
const config = {
  get: (k: string) => ({ OAUTH_TOKEN_KEY: 'clave-de-cifrado-de-prueba', NODE_ENV: 'test' } as Record<string, string>)[k],
  getOrThrow: (k: string) => `valor-de-${k}`,
};

function supabaseFalso(conexion: Record<string, string> | null, orden: string[] = []) {
  const consulta = (tabla: string) => {
    const q: any = {
      _op: 'select',
      select() { return q; },
      delete() { q._op = 'delete'; return q; },
      eq() { return q; },
      maybeSingle: async () => ({ data: tabla === 'email_connections' ? conexion : null, error: null }),
      then(ok: (v: unknown) => void) { orden.push(`${q._op}:${tabla}`); ok({ data: null, error: null }); },
    };
    return q;
  };
  return { from: consulta, auth: { admin: { deleteUser: async () => { orden.push('deleteUser'); return { error: null }; } } } } as any;
}

function conFetch(respuesta: () => Promise<Response>) {
  const llamadas: { url: string; cuerpo: string }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: any, init?: RequestInit) => {
    llamadas.push({ url: String(url), cuerpo: String(init?.body ?? '') });
    return respuesta();
  }) as typeof fetch;
  return { llamadas, restaurar: () => { globalThis.fetch = original; } };
}

function servicio(conexion: Record<string, string> | null, orden?: string[]) {
  return new EmailSyncService(supabaseFalso(conexion, orden), config as any);
}

test('revoca en Google el refresh token DESCIFRADO', async () => {
  const svc0 = servicio(null);
  const cifrado = (svc0 as any).encryptToken('refresh-de-ana');
  assert.notEqual(cifrado, 'refresh-de-ana');
  const svc = servicio({ refresh_token: cifrado, access_token: '' });
  const f = conFetch(async () => new Response('', { status: 200 }));
  try {
    assert.equal(await svc.revocarAccesoGoogle(USER), 'revocado');
    assert.equal(f.llamadas.length, 1);
    assert.equal(f.llamadas[0].url, 'https://oauth2.googleapis.com/revoke');
    assert.equal(new URLSearchParams(f.llamadas[0].cuerpo).get('token'), 'refresh-de-ana');
  } finally { f.restaurar(); }
});

test('sin conexión de Gmail no llama a Google', async () => {
  const f = conFetch(async () => new Response('', { status: 200 }));
  try {
    assert.equal(await servicio(null).revocarAccesoGoogle(USER), 'sin_conexion');
    assert.equal(f.llamadas.length, 0);
  } finally { f.restaurar(); }
});

test('un 400 de Google es token ya inválido; otro error o la red caída son fallo', async () => {
  for (const [resp, esperado] of [
    [async () => new Response('{"error":"invalid_token"}', { status: 400 }), 'ya_invalido'],
    [async () => new Response('', { status: 503 }), 'fallo'],
    [async () => { throw new Error('sin red'); }, 'fallo'],
  ] as const) {
    const f = conFetch(resp as () => Promise<Response>);
    try {
      assert.equal(await servicio({ refresh_token: 'plano-viejo', access_token: '' }).revocarAccesoGoogle(USER), esperado);
    } finally { f.restaurar(); }
  }
});

test('borrar la cuenta revoca ANTES de borrar email_connections', async () => {
  const orden: string[] = [];
  const emailSync = { revocarAccesoGoogle: async () => { orden.push('revocar'); return 'revocado' as const; } };
  const users = new UsersService(supabaseFalso(null, orden), emailSync as any);
  await users.deleteAccount(USER);
  const iRevocar = orden.indexOf('revocar');
  const iBorrar = orden.indexOf('delete:email_connections');
  assert.ok(iRevocar >= 0 && iBorrar > iRevocar, orden.join(' → '));
  assert.ok(orden.includes('deleteUser'));
});

test('si Google falla, la cuenta se borra igual', async () => {
  const orden: string[] = [];
  const emailSync = { revocarAccesoGoogle: async () => { throw new Error('Google caído'); } };
  const users = new UsersService(supabaseFalso(null, orden), emailSync as any);
  const r = await users.deleteAccount(USER);
  assert.equal(r.message, 'Cuenta eliminada permanentemente');
  assert.ok(orden.includes('delete:email_connections') && orden.includes('deleteUser'));
});
