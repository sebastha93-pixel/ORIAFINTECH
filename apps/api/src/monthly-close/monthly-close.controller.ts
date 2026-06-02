import { Controller, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MonthlyCloseService } from './monthly-close.service';

@ApiTags('monthly-close')
@Controller({ path: 'monthly-close', version: '1' })
export class MonthlyCloseController {
  constructor(private readonly monthlyCloseService: MonthlyCloseService) {}

  @Post('run-public')
  @ApiOperation({ summary: 'Manually trigger month close (backfill)' })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'month', required: true })
  @HttpCode(HttpStatus.OK)
  async runClose(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const result = await this.monthlyCloseService.closeMonthPublic(
      parseInt(year, 10),
      parseInt(month, 10),
    );
    return { ...result, year, month };
  }
}
