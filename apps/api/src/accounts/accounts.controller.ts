import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'accounts', version: '1' })
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  @Get() findAll(@CurrentUser() user: User) { return this.service.findAll(user.id); }
  @Get('balance') getBalance(@CurrentUser() user: User) { return this.service.getBalance(user.id); }
  @Get(':id') findOne(@CurrentUser() user: User, @Param('id') id: string) { return this.service.findOne(user.id, id); }
  @Post() create(@CurrentUser() user: User, @Body() dto: CreateAccountDto) { return this.service.create(user.id, dto); }
  @Put(':id') update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateAccountDto) { return this.service.update(user.id, id, dto); }
  @Delete(':id') remove(@CurrentUser() user: User, @Param('id') id: string) { return this.service.remove(user.id, id); }
}
