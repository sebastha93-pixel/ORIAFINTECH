import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Header,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@supabase/supabase-js';
import { EmailSyncService } from './email-sync.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Safe to embed inside an inline <script> string literal: JSON-encodes then
// neutralizes `<` so a value can't break out with `</script>` or inject markup.
function jsString(value: string | number): string {
  // JSON-encode, then neutralize characters that can break out of an inline
  // <script> string literal: `<` (markup/`</script>`) and the U+2028/U+2029
  // line separators (valid in JSON, but terminate a JS string).
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const successHtml = (email: string, count: number, frontendUrl: string) => {
  const emailHtml = escapeHtml(email);
  const emailJs   = jsString(email);
  const countJs   = jsString(count);
  const urlJs     = jsString(frontendUrl);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gmail Conectado – Nexo Finanzas</title>
  <style>
    body { margin:0; font-family:-apple-system,sans-serif; background:#070B14; color:#fff; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#111827; border:1px solid #1e3a5f; border-radius:20px; padding:40px 32px; max-width:380px; text-align:center; }
    .icon { font-size:56px; margin-bottom:16px; }
    h2 { margin:0 0 8px; font-size:22px; }
    p { color:#9ca3af; font-size:14px; margin:0 0 24px; line-height:1.6; }
    .email { color:#3b82f6; font-weight:600; }
    button { background:linear-gradient(135deg,#1d4ed8,#7c3aed); color:#fff; border:none; border-radius:12px; padding:14px 32px; font-size:15px; font-weight:700; cursor:pointer; width:100%; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h2>Gmail conectado</h2>
    <p>Tu cuenta <span class="email">${emailHtml}</span> está conectada.<br>${count} movimiento${count !== 1 ? 's' : ''} importado${count !== 1 ? 's' : ''} automáticamente.</p>
    <button onclick="notify()">Volver a Nexo</button>
  </div>
  <script>
    function notify() {
      if (window.opener && !window.opener.closed) {
        const allowed = ['https://oriafintech.com','https://www.oriafintech.com','http://localhost:5173'];
        const target  = allowed.includes(window.opener.location.origin) ? window.opener.location.origin : allowed[0];
        window.opener.postMessage({ type: 'nexo_gmail_connected', email: ${emailJs}, count: ${countJs} }, target);
        window.close();
      } else {
        window.location.href = ${urlJs} + '?gmail=connected&email=' + encodeURIComponent(${emailJs}) + '&count=' + ${countJs};
      }
    }
    setTimeout(notify, 1200);
  </script>
</body>
</html>`;
};

const errorHtml = (msg: string) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error – Nexo Finanzas</title>
  <style>
    body { margin:0; font-family:-apple-system,sans-serif; background:#070B14; color:#fff; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#111827; border:1px solid #7f1d1d; border-radius:20px; padding:40px 32px; max-width:380px; text-align:center; }
    .icon { font-size:56px; margin-bottom:16px; }
    h2 { margin:0 0 8px; font-size:22px; color:#ef4444; }
    p { color:#9ca3af; font-size:14px; margin:0 0 24px; line-height:1.6; }
    button { background:#1f2937; color:#fff; border:1px solid #374151; border-radius:12px; padding:14px 32px; font-size:15px; font-weight:700; cursor:pointer; width:100%; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h2>Error al conectar</h2>
    <p>${msg}</p>
    <button onclick="window.close()">Cerrar</button>
  </div>
</body>
</html>`;

@ApiTags('email-sync')
@Controller({ path: 'email-sync', version: '1' })
export class EmailSyncController {
  private readonly logger = new Logger(EmailSyncController.name);

  constructor(private readonly emailSyncService: EmailSyncService) {}

  @Get('auth/google')
  @ApiOperation({ summary: 'Get Google OAuth authorization URL' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getAuthUrl(@CurrentUser() user: User): { url: string } {
    // The state is derived server-side from the authenticated user and signed.
    // Client-supplied state is ignored — this prevents binding another user's
    // Gmail to this account (or vice-versa).
    const state = this.emailSyncService.createSignedState(user.id);
    const url = this.emailSyncService.getAuthUrl(state);
    return { url };
  }

  @Get('auth/callback')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state?: string,
    @Query('error') oauthError?: string,
  ): Promise<string> {
    if (oauthError) {
      return errorHtml(`Google OAuth error: ${escapeHtml(oauthError)}`);
    }
    if (!code) {
      return errorHtml('Parámetro code faltante. Intenta conectar de nuevo.');
    }
    if (!state) {
      return errorHtml('Parámetro state faltante. Intenta conectar de nuevo.');
    }

    // Recover the real user id from the signed state. A forged/expired/tampered
    // state is rejected here — the callback never trusts state as an identity.
    let userId: string;
    try {
      userId = this.emailSyncService.verifySignedState(state);
    } catch {
      return errorHtml('La sesión de conexión expiró o es inválida. Intenta conectar de nuevo.');
    }

    try {
      const { access_token, refresh_token, expiry_date, email } =
        await this.emailSyncService.exchangeCodeForTokens(code);

      await this.emailSyncService.storeTokens(userId, email, access_token, refresh_token, expiry_date);

      this.logger.log(`Gmail connected for user ${userId}. Running initial sync…`);

      const { transactionsCreated, errors } = await this.emailSyncService.syncEmails(userId);

      if (errors.length) {
        this.logger.warn(`Initial sync had ${errors.length} errors.`);
      }

      // Backfill monthly summaries for all past months in background
      this.emailSyncService.backfillMonthlySummaries(userId).catch((e: unknown) => {
        this.logger.warn(`Backfill failed for user ${userId}: ${String(e)}`);
      });

      const frontendUrl = this.emailSyncService.getFrontendUrl();
      return successHtml(email, transactionsCreated, frontendUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`OAuth callback error: ${msg}`);
      return errorHtml('No se pudo conectar Gmail. Intenta de nuevo.');
    }
  }

  @Post('sync')
  @ApiOperation({ summary: 'Manually trigger Gmail sync' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async triggerSync(@CurrentUser() user: User): Promise<{
    message: string;
    emailsProcessed: number;
    transactionsCreated: number;
    errors: string[];
  }> {
    this.logger.log(`Manual sync triggered for user ${user.id}`);
    const result = await this.emailSyncService.syncEmails(user.id);
    return { message: 'Sync completed', ...result };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Gmail sync status' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getStatus(@CurrentUser() user: User): Promise<{
    connected: boolean;
    lastSync: string | null;
    emailsProcessed: number;
    transactionsCreated: number;
  }> {
    return this.emailSyncService.getStatus(user.id);
  }

  @Get('fetch-emails')
  @ApiOperation({ summary: 'Fetch raw bank emails for client-side parsing' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async fetchEmails(@CurrentUser() user: User): Promise<{
    messageId: string; bank: string; subject: string; body: string; date: string;
  }[]> {
    return this.emailSyncService.fetchEmailsForClient(user.id);
  }
}
