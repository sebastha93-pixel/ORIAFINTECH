import {
  Controller,
  Get,
  Post,
  Query,
  Redirect,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User } from '@supabase/supabase-js';
import { EmailSyncService } from './email-sync.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('email-sync')
@Controller({ path: 'email-sync', version: '1' })
export class EmailSyncController {
  private readonly logger = new Logger(EmailSyncController.name);

  constructor(private readonly emailSyncService: EmailSyncService) {}

  /**
   * GET /email-sync/auth/google
   * Returns a Google OAuth URL that the client must redirect the user to.
   * If called from a browser directly, it will redirect (302).
   */
  @Get('auth/google')
  @ApiOperation({ summary: 'Get Google OAuth authorization URL' })
  @ApiQuery({ name: 'state', required: false, description: 'Optional state parameter (e.g. JWT token or user ID to identify the user on callback)' })
  getAuthUrl(@Query('state') state?: string): { url: string } {
    const url = this.emailSyncService.getAuthUrl(state);
    return { url };
  }

  /**
   * GET /email-sync/auth/callback
   * Google redirects here after the user grants consent.
   * Exchanges the code for tokens, stores them, and runs an initial sync.
   */
  @Get('auth/callback')
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state?: string,
    @Query('error') oauthError?: string,
  ): Promise<{ message: string; emailsProcessed: number; transactionsCreated: number }> {
    if (oauthError) {
      throw new InternalServerErrorException(`Google OAuth error: ${oauthError}`);
    }

    if (!code) {
      throw new InternalServerErrorException('Missing OAuth code parameter');
    }

    // state is expected to carry the Supabase user ID
    if (!state) {
      throw new InternalServerErrorException(
        'Missing state parameter. Pass your user ID as ?state=<userId> when initiating the flow.',
      );
    }

    const userId = state;

    const { access_token, refresh_token, expiry_date, email } =
      await this.emailSyncService.exchangeCodeForTokens(code);

    await this.emailSyncService.storeTokens(userId, email, access_token, refresh_token, expiry_date);

    this.logger.log(`Gmail connected for user ${userId} (${email}). Running initial sync…`);

    const { emailsProcessed, transactionsCreated, errors } =
      await this.emailSyncService.syncEmails(userId);

    if (errors.length) {
      this.logger.warn(`Initial sync had ${errors.length} errors: ${errors.join('; ')}`);
    }

    return {
      message: `Gmail account ${email} connected successfully.`,
      emailsProcessed,
      transactionsCreated,
    };
  }

  /**
   * POST /email-sync/sync
   * Manually trigger a Gmail sync for the authenticated user.
   * Requires a valid Supabase JWT in the Authorization header.
   */
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
    return {
      message: 'Sync completed',
      ...result,
    };
  }

  /**
   * GET /email-sync/status
   * Returns connection status and sync stats for the authenticated user.
   */
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
}
