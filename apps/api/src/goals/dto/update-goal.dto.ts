import { PartialType } from '@nestjs/swagger';
import { CreateGoalDto } from './create-goal.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { GoalStatus } from '@nexo/shared';

export class UpdateGoalDto extends PartialType(CreateGoalDto) {
  @IsOptional()
  @IsEnum(['active', 'completed', 'paused', 'cancelled'])
  status?: GoalStatus;
}
