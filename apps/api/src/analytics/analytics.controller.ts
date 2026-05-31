import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'dashboard', version: '1' })
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get complete dashboard data' })
  getDashboard(@CurrentUser() user: User) {
    return this.service.getDashboard(user.id);
  }
}
