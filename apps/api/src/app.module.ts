import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AssetsModule } from './assets/assets.module';
import { GoalsModule } from './goals/goals.module';
import { AiModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SupabaseModule } from './common/supabase/supabase.module';
import { EmailSyncModule } from './email-sync/email-sync.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    SupabaseModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    TransactionsModule,
    AssetsModule,
    GoalsModule,
    AiModule,
    AnalyticsModule,
    EmailSyncModule,
  ],
})
export class AppModule {}
