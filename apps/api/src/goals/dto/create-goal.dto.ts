import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, IsUUID, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GoalType } from '../../shared-types';

export class CreateGoalDto {
  @ApiProperty({ example: 'Fondo de emergencia' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: ['savings', 'debt_payoff', 'investment', 'emergency_fund', 'purchase', 'retirement', 'travel', 'education', 'other'] })
  @IsEnum(['savings', 'debt_payoff', 'investment', 'emergency_fund', 'purchase', 'retirement', 'travel', 'education', 'other'])
  goal_type: GoalType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 10000000 })
  @IsNumber()
  @Min(1)
  target_amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  current_amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  target_date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthly_contribution?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  linked_account_id?: string;
}
