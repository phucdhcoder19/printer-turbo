import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** 1 Facebook Page mà user quản lý (mỗi Page → 1 social_account). */
export interface FacebookPage {
  id: string;
  name: string;
  accessToken: string; // token RIÊNG của Page (dùng để đăng bài lên Page đó)
  pictureUrl: string | null;
}

/**
 * Gói toàn bộ HTTP gọi sang Facebook Graph API.
 *
 * TẠI SAO tách thành provider riêng?
 * → Service chỉ lo state + lưu DB; provider lo chi tiết từng nền tảng.
 *   Mỗi nền tảng 1 file → dễ đọc, dễ test, đổi version API không đụng service.
 */
@Injectable()
export class FacebookProvider {
  private readonly GRAPH = "https://graph.facebook.com/v21.0";
  private readonly DIALOG = "https://www.facebook.com/v21.0/dialog/oauth";

  constructor(private readonly config: ConfigService) {}

  /** Bước 1: URL để redirect user sang Facebook xin quyền. */
  getAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>("facebook.appId"),
      redirect_uri: this.config.getOrThrow<string>("facebook.redirectUri"),
      state,
      // Scope cấu hình qua FB_SCOPES (mặc định chỉ kết nối/liệt kê Page).
      // Đăng bài cần thêm pages_manage_posts,pages_read_engagement.
      scope: this.config.get<string>(
        "facebook.scopes",
        "public_profile,pages_show_list",
      ),
      response_type: "code",
      // Bắt FB hỏi lại các quyền mới/đã từ chối khi kết nối lại (tránh dùng
      // token cũ thiếu quyền → lỗi #283).
      auth_type: "rerequest",
    });
    return `${this.DIALOG}?${params.toString()}`;
  }

  /** Bước 2: đổi "code" (FB trả về khi callback) → user access token. */
  async exchangeCode(code: string): Promise<{ accessToken: string }> {
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>("facebook.appId"),
      client_secret: this.config.getOrThrow<string>("facebook.appSecret"),
      redirect_uri: this.config.getOrThrow<string>("facebook.redirectUri"),
      code,
    });
    const res = await fetch(
      `${this.GRAPH}/oauth/access_token?${params.toString()}`,
    );
    const json = (await res.json()) as {
      access_token?: string;
      error?: { message: string };
    };
    if (!json.access_token) {
      throw new Error(json.error?.message ?? "Facebook không trả access token");
    }
    return { accessToken: json.access_token };
  }

  /** Bước 3: lấy danh sách Page (kèm token + avatar từng Page). */
  async getPages(userAccessToken: string): Promise<FacebookPage[]> {
    const res = await fetch(
      `${this.GRAPH}/me/accounts?fields=id,name,access_token,picture&access_token=${userAccessToken}`,
    );
    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        name: string;
        access_token: string;
        picture?: { data?: { url?: string } };
      }>;
    };
    return (json.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      accessToken: p.access_token,
      pictureUrl: p.picture?.data?.url ?? null,
    }));
  }
}
