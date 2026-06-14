import { Module }          from '@nestjs/common';
import { APP_GUARD }       from '@nestjs/core';
import { HealthController } from './health.controller';
import { ConfigModule }    from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule }  from '@nestjs/schedule';
import { AuthModule }          from './auth/auth.module';
import { UsersModule }         from './users/users.module';
import { AccountsModule }      from './accounts/accounts.module';
import { TransactionsModule }  from './transactions/transactions.module';
import { AssetsModule }        from './assets/assets.module';
import { GoalsModule }         from './goals/goals.module';
import { AiModule }            from './ai/ai.module';
import { AnalyticsModule }     from './analytics/analytics.module';
import { SupabaseModule }      from './common/supabase/supabase.module';
import { AuditModule }         from './common/audit/audit.module';
import { EmailSyncModule }     from './email-sync/email-sync.module';
import { MonthlyCloseModule }  from './monthly-close/monthly-close.module';
import { AdminModule }         from './admin/admin.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,   limit: 10  }, // 10 req/s burst
      { name: 'medium', ttl: 60000,  limit: 100 }, // 100 req/min
      { name: 'long',   ttl: 900000, limit: 300 }, // 300 req/15min
    ]),
    SupabaseModule,
    AuditModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    TransactionsModule,
    AssetsModule,
    GoalsModule,
    AiModule,
    AnalyticsModule,
    EmailSyncModule,
    MonthlyCloseModule,
    AdminModule,
  ],
  providers: [
    // Enforce rate limiting globally on every route
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
