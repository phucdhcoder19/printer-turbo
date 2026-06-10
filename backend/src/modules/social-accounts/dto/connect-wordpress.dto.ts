import { IsNotEmpty, IsString, IsUrl } from "class-validator";

/**
 * Body kết nối WordPress bằng Application Password.
 * teamId/userId KHÔNG nằm ở đây — lấy từ JWT (@CurrentUser) cho an toàn.
 */
export class ConnectWordpressDto {
  // URL site WordPress, ví dụ https://blog.cua-ban.com
  @IsUrl({ require_protocol: true })
  siteUrl: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  // Application Password tạo trong WP Users → Profile (dạng "xxxx xxxx xxxx xxxx")
  @IsString()
  @IsNotEmpty()
  appPassword: string;
}
