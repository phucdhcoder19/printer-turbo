import { Injectable, Logger } from "@nestjs/common";

export interface WordpressPublishInput {
  siteUrl: string; // đã chuẩn hoá (không có "/" cuối)
  authHeader: string; // "Basic base64(user:appPassword)" — đã giải mã
  title: string;
  contentHtml: string; // nội dung HTML (đã gồm ảnh inline nếu có)
  imageUrl?: string | null; // ảnh đặt làm featured image (best-effort)
}

export interface PublishResult {
  externalId: string;
  url: string;
}

/**
 * Đăng bài lên WordPress self-host qua REST API (Application Password).
 *
 * Luồng:
 *  1. (best-effort) nếu có imageUrl → tải ảnh từ Cloudinary → upload lên
 *     /wp/v2/media → lấy media id để set featured image.
 *  2. POST /wp/v2/posts {title, content, status:'publish', featured_media?}.
 */
@Injectable()
export class WordpressPublisher {
  private readonly logger = new Logger(WordpressPublisher.name);

  async publish(input: WordpressPublishInput): Promise<PublishResult> {
    const base = input.siteUrl.replace(/\/+$/, "");
    const headers = {
      Authorization: input.authHeader,
      "Content-Type": "application/json",
    };

    // 1) Featured image (không chặn đăng nếu lỗi)
    let featuredMediaId: number | undefined;
    if (input.imageUrl) {
      try {
        featuredMediaId = await this.uploadFeaturedImage(
          base,
          input.authHeader,
          input.imageUrl,
        );
      } catch (err) {
        this.logger.warn(
          `Bỏ qua featured image (${(err as Error).message})`,
        );
      }
    }

    // 2) Tạo bài
    const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: input.title,
        content: input.contentHtml,
        status: "publish",
        ...(featuredMediaId ? { featured_media: featuredMediaId } : {}),
      }),
    });

    const json = (await res.json()) as {
      id?: number;
      link?: string;
      message?: string;
      code?: string;
    };
    if (!res.ok || !json.id) {
      throw new Error(
        json.message ?? `WordPress trả lỗi ${res.status} khi đăng bài`,
      );
    }
    return { externalId: String(json.id), url: json.link ?? `${base}/?p=${json.id}` };
  }

  /** Tải ảnh từ URL công khai (Cloudinary) rồi upload vào thư viện WP. */
  private async uploadFeaturedImage(
    base: string,
    authHeader: string,
    imageUrl: string,
  ): Promise<number> {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Tải ảnh nguồn lỗi ${imgRes.status}`);
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const fileName = imageUrl.split("/").pop()?.split("?")[0] ?? "image.jpg";

    const res = await fetch(`${base}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
      body: buffer,
    });
    const json = (await res.json()) as { id?: number; message?: string };
    if (!res.ok || !json.id) {
      throw new Error(json.message ?? `upload media lỗi ${res.status}`);
    }
    return json.id;
  }
}
