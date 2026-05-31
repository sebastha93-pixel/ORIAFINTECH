import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AiChatDto {
  @ApiProperty({ example: '¿Cómo está mi patrimonio este mes?' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  conversation_id?: string;
}
