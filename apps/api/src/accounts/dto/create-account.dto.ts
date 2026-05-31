import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@nexo/shared';

export class CreateAccountDto {
  @ApiProperty({ example: 'Bancolombia Ahorros' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ required: false, example: 'Bancolombia' })
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiProperty({ enum: ['checking', 'savings', 'credit_card', 'investment', 'crypto', 'cash', 'loan', 'other'] })
  @IsEnum(['checking', 'savings', 'credit_card', 'investment', 'crypto', 'cash', 'loan', 'other'])
  account_type: AccountType;

  @ApiProperty({ example: 'COP', required: false })
  @IsOptional()
  @IsString()
  currency_code?: string;

  @ApiProperty({ example: 5000000, required: false })
  @IsOptional()
  @IsNumber()
  current_balance?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  credit_limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  interest_rate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  icon?: string;
}
