import { IsOptional, IsEnum, IsString, IsNumber, IsDateString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../../shared-types';

export class TransactionFiltersDto {
  @IsOptional() @IsUUID() account_id?: string;
  @IsOptional() @IsUUID() category_id?: string;
  @IsOptional() @IsEnum(['income', 'expense', 'transfer']) transaction_type?: TransactionType;
  @IsOptional() @IsDateString() date_from?: string;
  @IsOptional() @IsDateString() date_to?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) min_amount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) max_amount?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) limit?: number;
}
