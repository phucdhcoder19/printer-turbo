import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Body cho POST /api/video/videos.
 * Khớp với TaskVideoRequest của FastAPI (app/models/schema.py).
 * NestJS validate trước, rồi mới chuyển tiếp sang FastAPI.
 */
export class CreateVideoDto {
  @IsString()
  topic: string;

  @IsOptional()
  @IsString()
  voice_name?: string = 'vi-VN-HoaiMyNeural';

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  voice_rate?: number = 1.0;

  @IsOptional()
  @IsString()
  bgm_file?: string = '';

  @IsOptional()
  @IsIn(['9:16', '16:9', '1:1'])
  video_aspect?: string = '9:16';

  @IsOptional()
  @IsIn(['random', 'sequential'])
  video_concat_mode?: string = 'random';

  @IsOptional()
  @IsBoolean()
  subtitle_enabled?: boolean = true;
}
