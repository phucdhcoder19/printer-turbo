import { Injectable, UnauthorizedException } from "@nestjs/common";

export interface WordpressUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Kết nối WordPress self-host bằng Application Password (WP 5.6+).
 *
 * TẠI SAO không OAuth?
 * → WordPress self-host (.org) KHÔNG có OAuth tập trung như Facebook/TikTok.
 *   Cách chuẩn để app ngoài đăng bài: user tạo "Application Password" trong
 *   Users → Profile, rồi app gọi REST API với HTTP Basic Auth.
 *
 * Xác minh: GET {site}/wp-json/wp/v2/users/me?context=edit
 *   200 → credentials hợp lệ, trả về user.
 *   401 → sai user/app-password.
 */
@Injectable()
export class WordpressProvider {
  /** Bỏ dấu "/" cuối để ghép path REST cho gọn. */
  normalizeSiteUrl(siteUrl: string): string {
    return siteUrl.trim().replace(/\/+$/, "");
  }

  /** Header Basic Auth từ username + application password. */
  private basicAuth(username: string, appPassword: string): string {
    // WP cho phép app password có dấu cách (xxxx xxxx ...) — bỏ cho chắc.
    const token = Buffer.from(
      `${username}:${appPassword.replace(/\s+/g, "")}`,
    ).toString("base64");
    return `Basic ${token}`;
  }

  /** Chuỗi credential lưu DB (sẽ được mã hoá ở service). */
  buildCredential(username: string, appPassword: string): string {
    return this.basicAuth(username, appPassword);
  }

  async verifyCredentials(
    siteUrl: string,
    username: string,
    appPassword: string,
  ): Promise<WordpressUser> {
    const base = this.normalizeSiteUrl(siteUrl);
    let res: Response;
    try {
      res = await fetch(`${base}/wp-json/wp/v2/users/me?context=edit`, {
        headers: { Authorization: this.basicAuth(username, appPassword) },
      });
    } catch {
      throw new UnauthorizedException(
        "Không kết nối được tới site WordPress. Kiểm tra Site URL.",
      );
    }

    if (res.status === 401 || res.status === 403) {
      throw new UnauthorizedException(
        "Sai username hoặc Application Password.",
      );
    }
    if (!res.ok) {
      throw new UnauthorizedException(
        `WordPress trả lỗi ${res.status}. Kiểm tra REST API có bật không.`,
      );
    }

    const json = (await res.json()) as {
      id?: number;
      name?: string;
      avatar_urls?: Record<string, string>;
    };
    if (!json.id) {
      throw new UnauthorizedException("Phản hồi WordPress không hợp lệ.");
    }
    // avatar_urls là map {size: url}; lấy size lớn nhất nếu có.
    const avatars = json.avatar_urls
      ? Object.values(json.avatar_urls)
      : [];
    return {
      id: String(json.id),
      name: json.name ?? username,
      avatarUrl: avatars.length ? avatars[avatars.length - 1] : null,
    };
  }
}
