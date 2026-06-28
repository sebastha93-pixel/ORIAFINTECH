import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { CreateLiabilityDto } from './dto/create-liability.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateLiabilityDto } from './dto/update-liability.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('patrimony')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'patrimony', version: '1' })
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'Get complete net worth overview' })
  getNetWorth(@CurrentUser() user: User) { return this.service.getNetWorth(user.id); }

  @Get('assets')
  findAssets(@CurrentUser() user: User) { return this.service.findAssets(user.id); }

  @Post('assets')
  createAsset(@CurrentUser() user: User, @Body() dto: CreateAssetDto) { return this.service.createAsset(user.id, dto); }

  @Put('assets/:id')
  updateAsset(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateAssetDto) { return this.service.updateAsset(user.id, id, dto); }

  @Delete('assets/:id')
  deleteAsset(@CurrentUser() user: User, @Param('id') id: string) { return this.service.deleteAsset(user.id, id); }

  @Get('liabilities')
  findLiabilities(@CurrentUser() user: User) { return this.service.findLiabilities(user.id); }

  @Post('liabilities')
  createLiability(@CurrentUser() user: User, @Body() dto: CreateLiabilityDto) { return this.service.createLiability(user.id, dto); }

  @Put('liabilities/:id')
  updateLiability(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateLiabilityDto) { return this.service.updateLiability(user.id, id, dto); }

  @Delete('liabilities/:id')
  deleteLiability(@CurrentUser() user: User, @Param('id') id: string) { return this.service.deleteLiability(user.id, id); }
}
