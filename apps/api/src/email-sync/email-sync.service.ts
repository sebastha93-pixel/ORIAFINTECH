import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual, createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';
import { parseBancolombia, parseDavivienda, parseNequi } from './parsers';
import type { ParsedTransaction } from './parsers';

interface TokenSet {
  access_token: string;
  refresh_token: string;
  token_expiry: string | null;
}

interface EmailConnection {
  id: string;
  user_id: string;
  gmail_address: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string | null;
  last_sync: string | null;
  emails_processed: number;
  transactions_created: number;
}

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailMessagePayload {
  headers: { name: string; value: string }[];
  body?: { data?: string };
  parts?: GmailMessagePayload[];
  mimeType?: string;
}

interface GmailFullMessage {
  id: string;
  payload: GmailMessagePayload;
  internalDate?: string;
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const BANK_QUERY =
  '(from:notificacionesbancolombia.com OR from:bancolombia.com OR from:bancolombia.com.co OR from:davivienda.com OR from:davivienda.com.co OR from:nequi.com) newer_than:30d';

@Injectable()
export class EmailSyncService {
  private readonly logger = new Logger(EmailSyncService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly stateSecret: string;
  private readonly tokenKey: Buffer | null;
  private static readonly ENC_PREFIX = 'enc:v1:';

  // Signed OAuth state lifetime — long enough to complete consent, short
  // enough to limit replay. The state is a one-way binding to the user id.
  private static readonly STATE_TTL_MS = 15 * 60 * 1000;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET');
    this.redirectUri =
      this.configService.get<string>('GOOGLE_REDIRECT_URI') ||
      'http://localhost:3001/email-sync/auth/callback';
    // Dedicated secret if provided, otherwise derive from the service-role key
    // (already a high-entropy server-only secret). Never client-exposed.
    this.stateSecret =
      this.configService.get<string>('OAUTH_STATE_SECRET') ??
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    // Encryption key for Gmail tokens at rest. If OAUTH_TOKEN_KEY is set we
    // derive a 32-byte AES key from it; otherwise tokens are stored as before
    // (plaintext) so existing deployments keep working. Set the env var to
    // enable encryption — new/refreshed rows are then encrypted automatically.
    const rawKey = this.configService.get<string>('OAUTH_TOKEN_KEY');
    this.tokenKey = rawKey ? createHash('sha256').update(rawKey).digest() : null;
    if (!this.tokenKey && this.configService.get<string>('NODE_ENV') === 'production') {
      this.logger.warn('OAUTH_TOKEN_KEY not set — Gmail tokens are stored unencrypted. Set it to enable at-rest encryption.');
    }
  }

  // ─── Token encryption at rest (AES-256-GCM) ──────────────────────────────
  private encryptToken(plain: string): string {
    if (!this.tokenKey || !plain) return plain;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.tokenKey, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return EmailSyncService.ENC_PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
  }

  private decryptToken(stored: string | null | undefined): string {
    if (!stored) return '';
    if (!stored.startsWith(EmailSyncService.ENC_PREFIX)) return stored; // legacy plaintext
    if (!this.tokenKey) {
      throw new InternalServerErrorException('Token cifrado pero OAUTH_TOKEN_KEY no está configurada.');
    }
    const raw = Buffer.from(stored.slice(EmailSyncService.ENC_PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.tokenKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8');
  }

  // ─── OAuth helpers ────────────────────────────────────────────────────────

  getFrontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL') ?? 'https://nexo-finanzas-tech-api.vercel.app';
  }

  /**
   * Build a tamper-proof OAuth `state` bound to the authenticated user id.
   * Format: base64url(payload).hmac  where payload = {uid, exp}.
   * The callback can recover the real uid only by verifying the HMAC, so a
   * client can never substitute another user's id (the C-1 fix).
   */
  createSignedState(userId: string): string {
    const payload = JSON.stringify({ uid: userId, exp: Date.now() + EmailSyncService.STATE_TTL_MS });
    const body = Buffer.from(payload, 'utf-8').toString('base64url');
    const sig = createHmac('sha256', this.stateSecret).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  /** Verify a signed state and return the bound user id, or throw. */
  verifySignedState(state: string): string {
    const dot = state.lastIndexOf('.');
    if (dot <= 0) throw new BadRequestException('Estado OAuth inválido.');
    const body = state.slice(0, dot);
    const sig = state.slice(dot + 1);
    const expected = createHmac('sha256', this.stateSecret).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new BadRequestException('Firma de estado OAuth inválida.');
    }
    let parsed: { uid?: string; exp?: number };
    try {
      parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as { uid?: string; exp?: number };
    } catch {
      throw new BadRequestException('Estado OAuth corrupto.');
    }
    if (!parsed.uid || !parsed.exp || Date.now() > parsed.exp) {
      throw new BadRequestException('El estado OAuth expiró. Intenta conectar de nuevo.');
    }
    return parsed.uid;
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email https://www.googleapis.com/auth/gmail.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string,
  ): Promise<{ access_token: string; refresh_token: string; expiry_date: number; email: string }> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) {
      // Never surface Google's raw response (may include token/grant details).
      this.logger.error(`Google token exchange failed (HTTP ${res.status})`);
      throw new InternalServerErrorException('No se pudo completar el intercambio de tokens con Google.');
    }

    const tokens = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    if (!tokens.refresh_token) {
      throw new InternalServerErrorException(
        'No refresh_token returned. Ensure offline access and prompt=consent are set.',
      );
    }

    const email = await this.fetchGmailAddress(tokens.access_token);
    const expiry_date = Date.now() + tokens.expires_in * 1000;

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date,
      email,
    };
  }

  private async fetchGmailAddress(accessToken: string): Promise<string> {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new InternalServerErrorException('Failed to fetch Gmail address');
    const info = (await res.json()) as { email: string };
    return info.email;
  }

  async storeTokens(
    userId: string,
    gmail_address: string,
    access_token: string,
    refresh_token: string,
    expiry_date: number,
  ): Promise<void> {
    const { error } = await this.supabase.from('email_connections').upsert(
      {
        user_id: userId,
        gmail_address,
        access_token: this.encryptToken(access_token),
        refresh_token: this.encryptToken(refresh_token),
        token_expiry: new Date(expiry_date).toISOString(),
        emails_processed: 0,
        transactions_created: 0,
      },
      { onConflict: 'user_id' },
    );

    if (error) throw new InternalServerErrorException(`Failed to store tokens: ${error.message}`);
  }

  // ─── Token management ─────────────────────────────────────────────────────

  private async getValidAccessToken(connection: EmailConnection): Promise<string> {
    const now = Date.now();
    const expiryMs = connection.token_expiry ? new Date(connection.token_expiry).getTime() : 0;

    // Refresh if expired or about to expire in 5 minutes
    if (expiryMs - now < 5 * 60 * 1000) {
      return this.refreshAccessToken(connection);
    }
    return this.decryptToken(connection.access_token);
  }

  private async refreshAccessToken(connection: EmailConnection): Promise<string> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.decryptToken(connection.refresh_token),
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      // Do not log the raw body — it can contain token/grant material.
      this.logger.error(`Token refresh failed for user ${connection.user_id} (HTTP ${res.status})`);
      throw new UnauthorizedException('Gmail token refresh failed. Please reconnect your account.');
    }

    const tokens = (await res.json()) as { access_token: string; expires_in: number };
    const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await this.supabase
      .from('email_connections')
      .update({ access_token: this.encryptToken(tokens.access_token), token_expiry: newExpiry })
      .eq('user_id', connection.user_id);

    return tokens.access_token;
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  async getStatus(userId: string): Promise<{
    connected: boolean;
    lastSync: string | null;
    emailsProcessed: number;
    transactionsCreated: number;
  }> {
    const { data } = await this.supabase
      .from('email_connections')
      .select('last_sync, emails_processed, transactions_created')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) {
      return { connected: false, lastSync: null, emailsProcessed: 0, transactionsCreated: 0 };
    }

    return {
      connected: true,
      lastSync: data.last_sync,
      emailsProcessed: data.emails_processed ?? 0,
      transactionsCreated: data.transactions_created ?? 0,
    };
  }

  // ─── Main sync ────────────────────────────────────────────────────────────

  async syncEmails(userId: string): Promise<{
    emailsProcessed: number;
    transactionsCreated: number;
    errors: string[];
  }> {
    const { data: connection, error: connErr } = await this.supabase
      .from('email_connections')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (connErr || !connection) {
      throw new UnauthorizedException(
        'No Gmail connection found. Please authenticate via /email-sync/auth/google.',
      );
    }

    const accessToken = await this.getValidAccessToken(connection as EmailConnection);

    const messages = await this.listMessages(accessToken, BANK_QUERY);
    this.logger.log(`Found ${messages.length} bank emails for user ${userId}`);

    let emailsProcessed = 0;
    let transactionsCreated = 0;
    const errors: string[] = [];

    for (const msg of messages) {
      try {
        const created = await this.processMessage(accessToken, msg.id, userId);
        emailsProcessed++;
        if (created) transactionsCreated++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to process message ${msg.id}: ${message}`);
        errors.push(`Message ${msg.id}: ${message}`);
      }
    }

    // Update stats
    await this.supabase
      .from('email_connections')
      .update({
        last_sync: new Date().toISOString(),
        emails_processed: (connection.emails_processed ?? 0) + emailsProcessed,
        transactions_created: (connection.transactions_created ?? 0) + transactionsCreated,
      })
      .eq('user_id', userId);

    return { emailsProcessed, transactionsCreated, errors };
  }

  // ─── Gmail API calls ──────────────────────────────────────────────────────

  private async listMessages(
    accessToken: string,
    query: string,
  ): Promise<GmailMessage[]> {
    const params = new URLSearchParams({ q: query, maxResults: '50' });
    const res = await fetch(`${GMAIL_API_BASE}/messages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      this.logger.error(`Gmail list messages failed (HTTP ${res.status})`);
      throw new InternalServerErrorException('No se pudieron listar los correos de Gmail.');
    }

    const data = (await res.json()) as { messages?: GmailMessage[] };
    return data.messages ?? [];
  }

  private async getMessage(
    accessToken: string,
    messageId: string,
  ): Promise<GmailFullMessage> {
    const res = await fetch(`${GMAIL_API_BASE}/messages/${messageId}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      this.logger.error(`Gmail get message failed (HTTP ${res.status})`);
      throw new InternalServerErrorException('No se pudo leer un correo de Gmail.');
    }

    return res.json() as Promise<GmailFullMessage>;
  }

  private decodeBase64(encoded: string): string {
    // Gmail uses URL-safe base64
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    try {
      return Buffer.from(normalized, 'base64').toString('utf-8');
    } catch {
      return '';
    }
  }

  private extractEmailBody(payload: GmailMessagePayload): string {
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return this.decodeBase64(payload.body.data);
    }

    if (payload.mimeType === 'text/html' && payload.body?.data) {
      const html = this.decodeBase64(payload.body.data);
      return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&oacute;/gi, 'ó').replace(/&eacute;/gi, 'é')
        .replace(/&iacute;/gi, 'í').replace(/&uacute;/gi, 'ú')
        .replace(/&aacute;/gi, 'á').replace(/&ntilde;/gi, 'ñ')
        .replace(/&Oacute;/gi, 'Ó').replace(/&Eacute;/gi, 'É')
        .replace(/&Iacute;/gi, 'Í').replace(/&Uacute;/gi, 'Ú')
        .replace(/&Aacute;/gi, 'Á').replace(/&Ntilde;/gi, 'Ñ')
        .replace(/&amp;/gi, '&').replace(/&nbsp;/gi, ' ')
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
        .replace(/\s+/g, ' ');
    }

    if (payload.parts) {
      // Try text/plain first — but only if non-empty after trimming
      const plain = payload.parts.find((p) => p.mimeType === 'text/plain');
      if (plain) {
        const plainText = this.extractEmailBody(plain);
        if (plainText.trim()) return plainText;
      }

      // Fall back to text/html (preferred for bank notification emails)
      const html = payload.parts.find((p) => p.mimeType === 'text/html');
      if (html) return this.extractEmailBody(html);

      // Recurse into nested multipart
      for (const part of payload.parts) {
        const body = this.extractEmailBody(part);
        if (body.trim()) return body;
      }
    }

    return '';
  }

  private getHeader(payload: GmailMessagePayload, name: string): string {
    return payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
  }

  private detectBank(from: string): 'bancolombia' | 'davivienda' | 'nequi' | null {
    if (/bancolombia/i.test(from)) return 'bancolombia';
    if (/davivienda/i.test(from)) return 'davivienda';
    if (/nequi/i.test(from)) return 'nequi';
    return null;
  }

  // ─── Message processing ───────────────────────────────────────────────────

  private async processMessage(
    accessToken: string,
    messageId: string,
    userId: string,
  ): Promise<boolean> {
    // Skip if already processed
    const { data: existing } = await this.supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('gmail_message_id', messageId)
      .maybeSingle();

    if (existing) {
      this.logger.debug(`Message ${messageId} already processed, skipping.`);
      return false;
    }

    const message = await this.getMessage(accessToken, messageId);
    const from = this.getHeader(message.payload, 'from');
    const subject = this.getHeader(message.payload, 'subject');
    const body = this.extractEmailBody(message.payload);

    if (!body && !subject) return false;

    const bank = this.detectBank(from);
    if (!bank) return false;

    let parsed: ParsedTransaction | null = null;

    if (bank === 'bancolombia') parsed = parseBancolombia(body, subject);
    else if (bank === 'davivienda') parsed = parseDavivienda(body, subject);
    else if (bank === 'nequi') parsed = parseNequi(body, subject);

    if (!parsed) {
      this.logger.debug(`No transaction parsed from message ${messageId} (${bank})`);
      return false;
    }

    // ── Account filtering ────────────────────────────────────────────────────
    // Load user's registered accounts
    const { data: userAccounts } = await this.supabase
      .from('accounts')
      .select('id, institution, account_suffix, account_holder, initial_balance_set_at')
      .eq('user_id', userId)
      .eq('is_active', true);

    // No registered accounts → block all imports
    if (!userAccounts || userAccounts.length === 0) {
      this.logger.debug(`No registered accounts for user ${userId}, skipping message ${messageId}`);
      return false;
    }

    type AccountRow = { id: string; institution: string; account_suffix: string | null; account_holder: string | null; initial_balance_set_at: string | null };

    let matchedAccount: AccountRow | undefined;

    if (bank === 'nequi') {
      // Nequi emails no incluyen número de cuenta — emparejar con la única cuenta Nequi registrada
      matchedAccount = (userAccounts as AccountRow[]).find(a => a.institution?.toLowerCase().includes('nequi'));
      if (!matchedAccount) {
        this.logger.debug(`No registered Nequi account for user ${userId}, skipping ${messageId}`);
        return false;
      }
    } else {
      // Para Bancolombia / Davivienda se requiere sufijo de cuenta extraído del email
      if (!parsed.accountSuffix) {
        this.logger.debug(`No account suffix parsed from message ${messageId} (${bank}), skipping`);
        return false;
      }
      matchedAccount = (userAccounts as AccountRow[]).find(a => {
        // Los últimos 4 dígitos de la cuenta DEBEN coincidir
        if (a.account_suffix !== parsed.accountSuffix) return false;
        // El banco debe coincidir
        if (!a.institution?.toLowerCase().includes(bank)) return false;
        // Si ambos lados tienen nombre de titular, DEBE coincidir
        if (a.account_holder && parsed.accountHolder) {
          if (!this.holderNamesMatch(a.account_holder, parsed.accountHolder)) return false;
        }
        return true;
      });
      if (!matchedAccount) {
        this.logger.debug(`Message ${messageId}: suffix ${parsed.accountSuffix} (${bank}) doesn't match any registered account for user ${userId}`);
        return false;
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // Full ISO timestamp for exact cutoff comparison
    const emailTimestamp = message.internalDate
      ? new Date(parseInt(message.internalDate, 10)).toISOString()
      : parsed.date;
    const emailDate = emailTimestamp.slice(0, 10);

    // Only import transactions from the exact moment the initial balance was set.
    // If initial_balance_set_at is NULL the account is not ready yet — block all imports.
    const cutoffAt = matchedAccount.initial_balance_set_at;
    if (!cutoffAt) {
      this.logger.debug(`Account for message ${messageId} has no initial balance set yet, skipping`);
      return false;
    }
    if (emailTimestamp < cutoffAt) {
      this.logger.debug(`Message ${messageId} (${emailTimestamp}) is before initial balance cutoff (${cutoffAt}), skipping`);
      return false;
    }

    // Resolve category_id from category name
    const categoryId = await this.resolveCategoryId(userId, parsed.category, parsed.type);

    const accountId: string = matchedAccount.id;

    const transactionPayload: Record<string, unknown> = {
      user_id: userId,
      transaction_type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      date: emailDate,
      currency_code: 'COP',
      gmail_message_id: messageId,
      notes: `Importado automáticamente desde ${bank}. Comercio: ${parsed.merchant ?? 'N/A'}`,
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(accountId ? { account_id: accountId } : {}),
    };

    const { error } = await this.supabase.from('transactions').insert(transactionPayload);

    if (error) {
      // Duplicate gmail_message_id unique constraint → already imported
      if (error.code === '23505') return false;
      throw new Error(`Failed to insert transaction: ${error.message}`);
    }

    this.logger.log(
      `Created ${parsed.type} transaction of ${parsed.amount} COP from ${bank} (msg ${messageId})`,
    );
    return true;
  }

  // ─── Helper resolvers ─────────────────────────────────────────────────────

  /** Compara nombres ignorando mayúsculas, tildes y palabras cortas. */
  private holderNamesMatch(registered: string, fromEmail: string): boolean {
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const reg = normalize(registered);
    const em  = normalize(fromEmail);
    if (reg.includes(em) || em.includes(reg)) return true;
    const regWords = reg.split(/\s+/).filter((w) => w.length > 2);
    return regWords.some((w) => em.includes(w));
  }

  private async resolveCategoryId(
    userId: string,
    categoryName: string,
    type: 'income' | 'expense',
  ): Promise<string | null> {
    const { data } = await this.supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', categoryName)
      .maybeSingle();

    if (data) return data.id;

    // Fallback: find first category of the right type
    const { data: fallback } = await this.supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('category_type', type)
      .limit(1)
      .maybeSingle();

    return fallback?.id ?? null;
  }

  private async resolveDefaultAccountId(userId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    return data?.id ?? null;
  }

  // ─── Fetch emails for client-side parsing ────────────────────────────────────

  async fetchEmailsForClient(userId: string): Promise<{
    messageId: string; bank: string; subject: string; body: string; date: string;
  }[]> {
    const { data: connection } = await this.supabase
      .from('email_connections').select('*').eq('user_id', userId).maybeSingle();
    if (!connection) return [];

    const accessToken = await this.getValidAccessToken(connection as EmailConnection);
    const messages = await this.listMessages(accessToken, BANK_QUERY);
    const results: { messageId: string; bank: string; subject: string; body: string; date: string }[] = [];

    for (const msg of messages) {
      const full = await this.getMessage(accessToken, msg.id);
      const from = this.getHeader(full.payload, 'from');
      const bank = this.detectBank(from);
      if (!bank) continue;

      const subject = this.getHeader(full.payload, 'subject');
      const body = this.extractEmailBody(full.payload);
      const date = full.internalDate
        ? new Date(parseInt(full.internalDate, 10)).toISOString()
        : new Date().toISOString();

      results.push({ messageId: msg.id, bank, subject, body: body.slice(0, 6000), date });
    }
    return results;
  }

  // ─── Backfill monthly summaries for past months ──────────────────────────

  async backfillMonthlySummaries(userId: string): Promise<void> {
    // Find oldest transaction date for this user
    const { data: oldest } = await this.supabase
      .from('transactions')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!oldest) return;

    const now = new Date();
    const start = new Date(oldest.date + 'T00:00:00');
    let y = start.getFullYear();
    let m = start.getMonth() + 1;

    while (y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1)) {
      const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay  = new Date(y, m, 0).toISOString().slice(0, 10);

      const { data: txns } = await this.supabase
        .from('transactions')
        .select('transaction_type, amount')
        .eq('user_id', userId)
        .gte('date', firstDay)
        .lte('date', lastDay);

      if (txns && txns.length > 0) {
        const totalIncome   = txns.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const totalExpenses = txns.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        const savingsRate   = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;

        await this.supabase.from('monthly_summaries').upsert({
          user_id: userId,
          year: y,
          month: m,
          total_income: totalIncome,
          total_expenses: totalExpenses,
          savings_rate: savingsRate,
        }, { onConflict: 'user_id,year,month' });
      }

      if (m === 12) { y++; m = 1; } else { m++; }
    }

    this.logger.log(`Backfill complete for user ${userId}`);
  }

  // ─── Cron: sync all users every 2 hours ──────────────────────────────────

  @Cron('0 */2 * * *') // every 2 hours, 24/7
  async syncAllUsers(): Promise<void> {
    this.logger.log('Cron: starting Gmail sync for all connected users…');

    const { data: connections, error } = await this.supabase
      .from('email_connections')
      .select('user_id');

    if (error || !connections?.length) {
      this.logger.log('Cron: no connected users found.');
      return;
    }

    let total = 0;
    for (const { user_id } of connections) {
      try {
        const { transactionsCreated } = await this.syncEmails(user_id as string);
        total += transactionsCreated;
      } catch (err) {
        this.logger.warn(`Cron: sync failed for user ${user_id as string}: ${String(err)}`);
      }
    }

    this.logger.log(`Cron: sync complete — ${total} new transactions across ${connections.length} users.`);
  }
}
