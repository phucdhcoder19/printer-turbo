import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface TiktokToken {
  accessToken: string;
  refreshToken: string | null;
  openId: string; // id duy nhất của user trên TikTok (định danh account)
  expiresIn: number; // giây
  scope: string;
}

export interface TiktokUser {
  openId: string;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Gói HTTP gọi sang TikTok Login Kit v2.
 *
 * Lưu ý API TikTok v2 (khác v1):
 *  - authorize:  https://www.tiktok.com/v2/auth/authorize/   (dùng client_key)
 *  - token:      https://open.tiktokapis.com/v2/oauth/token/ (POST form-urlencoded)
 *  - user info:  https://open.tiktokapis.com/v2/user/info/   (Bearer token)
 * Flow web (có client_secret) không bắt buộc PKCE.
 */
@Injectable()
export class TiktokProvider {
  private readonly AUTH = "https://www.tiktok.com/v2/auth/authorize/";
  private readonly TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";
  private readonly USER = "https://open.tiktokapis.com/v2/user/info/";

  constructor(private readonly config: ConfigService) {}

  /** Bước 1: URL redirect sang TikTok xin quyền. */
  getAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: this.config.getOrThrow<string>("tiktok.clientKey"),
      redirect_uri: this.config.getOrThrow<string>("tiktok.redirectUri"),
      response_type: "code",
      scope: "user.info.basic",
      state,
    });
    return `${this.AUTH}?${params.toString()}`;
  }

  /** Bước 2: đổi code → access token (+ refresh, open_id). */
  async exchangeCode(code: string): Promise<TiktokToken> {
    const body = new URLSearchParams({
      client_key: this.config.getOrThrow<string>("tiktok.clientKey"),
      client_secret: this.config.getOrThrow<string>("tiktok.clientSecret"),
      code,
      grant_type: "authorization_code",
      redirect_uri: this.config.getOrThrow<string>("tiktok.redirectUri"),
    });
    const res = await fetch(this.TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      open_id?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
      error_description?: string;
    };
    if (!json.access_token || !json.open_id) {
      throw new Error(
        json.error_description ?? json.error ?? "TikTok không trả access token",
      );
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      openId: json.open_id,
      expiresIn: json.expires_in ?? 0,
      scope: json.scope ?? "",
    };
  }

  /** Bước 3: lấy hồ sơ cơ bản (tên hiển thị + avatar). */
  async getUserInfo(accessToken: string): Promise<TiktokUser> {
    const params = new URLSearchParams({
      fields: "open_id,display_name,avatar_url",
    });
    const res = await fetch(`${this.USER}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json()) as {
      data?: {
        user?: { open_id: string; display_name: string; avatar_url?: string };
      };
      error?: { message?: string; code?: string };
    };
    const user = json.data?.user;
    if (!user) {
      throw new Error(json.error?.message ?? "Không lấy được thông tin TikTok");
    }
    return {
      openId: user.open_id,
      displayName: user.display_name,
      avatarUrl: user.avatar_url ?? null,
    };
  }
}
