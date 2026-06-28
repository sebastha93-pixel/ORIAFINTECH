import { Injectable, UnauthorizedException, Inject, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async register(dto: RegisterDto) {
    const { data, error } = await this.supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      user_metadata: { full_name: dto.full_name },
      email_confirm: false,
    });

    if (error) {
      // Don't echo Supabase's message (e.g. "already registered") — that
      // enables account enumeration. Log server-side, return generic.
      this.logger.warn(`Registration failed: ${error.message}`);
      throw new BadRequestException('No se pudo crear la cuenta. Verifica los datos e intenta de nuevo.');
    }

    // Sign in to get session token
    const { data: session, error: signInError } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (signInError) {
      this.logger.warn(`Post-register sign-in failed: ${signInError.message}`);
      throw new BadRequestException('La cuenta se creó pero no se pudo iniciar sesión. Intenta iniciar sesión manualmente.');
    }

    return {
      user: data.user,
      session: session.session,
      message: 'Account created successfully',
    };
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) throw new UnauthorizedException('Invalid email or password');

    return {
      user: data.user,
      session: data.session,
    };
  }

  async refreshToken(refresh_token: string) {
    const { data, error } = await this.supabase.auth.refreshSession({ refresh_token });
    if (error) throw new UnauthorizedException('Invalid refresh token');
    return { session: data.session };
  }

  async logout(token: string) {
    await this.supabase.auth.admin.signOut(token);
    return { message: 'Logged out successfully' };
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.RESET_PASSWORD_URL,
    });
    // Always return the same response whether or not the email exists, to
    // prevent account enumeration via differential responses.
    if (error) this.logger.warn(`Password reset request failed: ${error.message}`);
    return { message: 'Si la cuenta existe, enviamos un correo para restablecer la contraseña.' };
  }
}
