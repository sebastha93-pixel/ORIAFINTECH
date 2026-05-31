import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AssetType } from '@nexo/shared';

export class CreateAssetDto {
  @ApiProperty({ example: 'Apartamento Laureles' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: ['real_estate', 'vehicle', 'investment', 'retirement', 'crypto', 'business', 'collectible', 'other'] })
  @IsEnum(['real_estate', 'vehicle', 'investment', 'retirement', 'crypto', 'business', 'collectible', 'other'])
  asset_type: AssetType;

  @ApiProperty({ example: 350000000 })
  @IsNumber()
  @Min(0)
  current_value: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchase_value?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  purchase_date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency_code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;
}
