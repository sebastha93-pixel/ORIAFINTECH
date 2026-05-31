import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AddContributionDto } from './dto/add-contribution.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'goals', version: '1' })
export class GoalsController {
  constructor(private readonly service: GoalsService) {}

  @Get() findAll(@CurrentUser() user: User) { return this.service.findAll(user.id); }
  @Get(':id') findOne(@CurrentUser() user: User, @Param('id') id: string) { return this.service.findOne(user.id, id); }
  @Post() create(@CurrentUser() user: User, @Body() dto: CreateGoalDto) { return this.service.create(user.id, dto); }
  @Put(':id') update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateGoalDto) { return this.service.update(user.id, id, dto); }
  @Delete(':id') remove(@CurrentUser() user: User, @Param('id') id: string) { return this.service.remove(user.id, id); }

  @Post(':id/contributions')
  @ApiOperation({ summary: 'Add contribution to goal' })
  addContribution(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: AddContributionDto) {
    return this.service.addContribution(user.id, id, dto);
  }
}
