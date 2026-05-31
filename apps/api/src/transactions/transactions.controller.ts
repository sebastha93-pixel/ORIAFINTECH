import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'transactions', version: '1' })
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List transactions with filters' })
  findAll(@CurrentUser() user: User, @Query() filters: TransactionFiltersDto) {
    return this.service.findAll(user.id, filters);
  }

  @Get('monthly-stats')
  @ApiOperation({ summary: 'Get monthly income/expense stats' })
  monthlyStats(
    @CurrentUser() user: User,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.service.getMonthlyStats(user.id, year || new Date().getFullYear(), month || new Date().getMonth() + 1);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single transaction' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create transaction' })
  create(@CurrentUser() user: User, @Body() dto: CreateTransactionDto) {
    return this.service.create(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update transaction' })
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transaction' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
