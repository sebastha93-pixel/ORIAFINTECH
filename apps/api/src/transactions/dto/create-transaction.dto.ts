import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsDateString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@nexo/shared';

export class CreateTransactionDto {
  @ApiProperty()
  @IsUUID()
  account_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  to_account_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiProperty({ enum: ['income', 'expense', 'transfer'] })
  @IsEnum(['income', 'expense', 'transfer'])
  transaction_type: TransactionType;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'COP', required: false })
  @IsOptional()
  @IsString()
  currency_code?: string;

  @ApiProperty({ example: 'Almuerzo restaurante', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: '2024-05-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_recurring?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  tags?: string[];
}
