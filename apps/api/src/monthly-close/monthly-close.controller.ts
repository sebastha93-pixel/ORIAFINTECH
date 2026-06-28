import {
  Controller,
  Post,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MonthlyCloseService } from './monthly-close.service';

@ApiTags('monthly-close')
@Controller({ path: 'monthly-close', version: '1' })
export class MonthlyCloseController {
  constructor(
    private readonly monthlyCloseService: MonthlyCloseService,
    private readonly config: ConfigService,
  ) {}

  @Post('run')
  @ApiOperation({ summary: 'Admin: trigger month close (backfill). Requires x-admin-secret.' })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'month', required: true })
  @HttpCode(HttpStatus.OK)
  async runClose(
    @Headers('x-admin-secret') secret: string,
    @Query('year') yearRaw: string,
    @Query('month') monthRaw: string,
  ) {
    this.assertAdmin(secret);

    const year = parseInt(yearRaw, 10);
    const month = parseInt(monthRaw, 10);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('Parámetro year inválido.');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('Parámetro month inválido.');
    }

    const result = await this.monthlyCloseService.closeMonthPublic(year, month);
    return { ...result, year, month };
  }

  // Constant-time comparison of the admin secret; mirrors AdminController.
  private assertAdmin(secret: string): void {
    const expected = this.config.get<string>('ADMIN_SECRET');
    if (!expected || !secret) throw new ForbiddenException();
    const match =
      secret.length === expected.length &&
      timingSafeEqual(Buffer.from(secret), Buffer.from(expected));
    if (!match) throw new ForbiddenException();
  }
}
