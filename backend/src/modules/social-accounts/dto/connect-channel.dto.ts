import { IsOptional, IsString, IsUUID } from "class-validator";

export class ConnectChannelDto {
  // Tạm truyền teamId từ body. Sau có JWT → lấy từ token.
  @IsUUID()
  teamId: string;

  @IsOptional()
  @IsString()
  accountName?: string;
}
