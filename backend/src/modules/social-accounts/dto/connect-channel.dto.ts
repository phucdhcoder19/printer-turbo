import { IsOptional, IsString } from "class-validator";

/**
 * Body cho mock connect (instagram/youtube/threads/twitter — chưa có OAuth thật).
 * teamId lấy từ JWT (@CurrentUser), không truyền qua body nữa.
 */
export class ConnectChannelDto {
  @IsOptional()
  @IsString()
  accountName?: string;
}
