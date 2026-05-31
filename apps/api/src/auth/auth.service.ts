import { Injectable, UnauthorizedException, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../common/supabase/supabase.module';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
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

    if (error) throw new BadRequestException(error.message);

    // Sign in to get session token
    const { data: session, error: signInError } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (signInError) throw new BadRequestException(signInError.message);

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
    if (error) throw new BadRequestException(error.message);
    return { message: 'Password reset email sent' };
  }
}
