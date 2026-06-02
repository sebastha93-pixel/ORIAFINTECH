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

const successHtml = (email: string, userId: string, count: number, frontendUrl: string) => `<!DOCTYPE html>
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
    <p>Tu cuenta <span class="email">${email}</span> está conectada.<br>${count} movimiento${count !== 1 ? 's' : ''} importado${count !== 1 ? 's' : ''} automáticamente.</p>
    <button onclick="notify()">Volver a Nexo</button>
  </div>
  <script>
    function notify() {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'nexo_gmail_connected', email: '${email}', userId: '${userId}', count: ${count} }, '*');
        window.close();
      } else {
        window.location.href = '${frontendUrl}?gmail=connected&email=${encodeURIComponent(email)}&count=${count}';
      }
    }
    setTimeout(notify, 1200);
  </script>
</body>
</html>`;

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
  getAuthUrl(@Query('state') state?: string): { url: string } {
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
      return errorHtml(`Google OAuth error: ${oauthError}`);
    }
    if (!code) {
      return errorHtml('Parámetro code faltante. Intenta conectar de nuevo.');
    }
    if (!state) {
      return errorHtml('Parámetro state faltante. Intenta conectar de nuevo.');
    }

    try {
      const { access_token, refresh_token, expiry_date, email } =
        await this.emailSyncService.exchangeCodeForTokens(code);

      await this.emailSyncService.storeTokens(state, email, access_token, refresh_token, expiry_date);

      this.logger.log(`Gmail connected for user ${state} (${email}). Running initial sync…`);

      const { transactionsCreated, errors } = await this.emailSyncService.syncEmails(state);

      if (errors.length) {
        this.logger.warn(`Initial sync had ${errors.length} errors: ${errors.join('; ')}`);
      }

      // Backfill monthly summaries for all past months in background
      this.emailSyncService.backfillMonthlySummaries(state).catch((e: unknown) => {
        this.logger.warn(`Backfill failed for user ${state}: ${String(e)}`);
      });

      const frontendUrl = this.emailSyncService.getFrontendUrl();
      return successHtml(email, state, transactionsCreated, frontendUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`OAuth callback error: ${msg}`);
      return errorHtml(msg);
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
