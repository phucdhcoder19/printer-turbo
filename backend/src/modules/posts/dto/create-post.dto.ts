import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Platform } from "../../../common/enums";

// 1 phần tử targets = 1 nền tảng, có caption + hashtag riêng
export class CreatePostTargetDto {
  @IsEnum(Platform)
  platform: Platform;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @IsOptional()
  @IsString()
  scheduledAt?: string; // ISO date, vd "2026-06-10T09:00:00Z"
}

export class CreatePostDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  baseCaption?: string;

  @IsOptional()
  @IsUUID()
  contentPlanId?: string;

  // Ảnh/video đính kèm (id từ bảng media). Thứ tự mảng = thứ tự hiển thị.
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  mediaIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostTargetDto)
  targets: CreatePostTargetDto[];
}
