import { Module } from '@nestjs/common';
import { MonthlyCloseService } from './monthly-close.service';
import { MonthlyCloseController } from './monthly-close.controller';
import { SupabaseModule } from '../common/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [MonthlyCloseController],
  providers: [MonthlyCloseService],
  exports: [MonthlyCloseService],
})
export class MonthlyCloseModule {}
