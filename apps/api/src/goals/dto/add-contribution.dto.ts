import { IsNumber, IsOptional, IsString, IsDateString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddContributionDto {
  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  contribution_date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  transaction_id?: string;
}
