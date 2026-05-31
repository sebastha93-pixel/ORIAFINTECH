import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LiabilityType } from '@nexo/shared';

export class CreateLiabilityDto {
  @ApiProperty({ example: 'Hipoteca apartamento' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: ['mortgage', 'car_loan', 'personal_loan', 'student_loan', 'credit_card', 'other'] })
  @IsEnum(['mortgage', 'car_loan', 'personal_loan', 'student_loan', 'credit_card', 'other'])
  liability_type: LiabilityType;

  @ApiProperty({ example: 200000000 })
  @IsNumber()
  @Min(0)
  original_amount: number;

  @ApiProperty({ example: 175000000 })
  @IsNumber()
  @Min(0)
  current_balance: number;

  @ApiProperty({ required: false, example: 0.1198 })
  @IsOptional()
  @IsNumber()
  interest_rate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthly_payment?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency_code?: string;
}
