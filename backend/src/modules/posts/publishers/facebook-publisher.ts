import { Injectable } from "@nestjs/common";
import type { PublishResult } from "./wordpress-publisher";

export interface FacebookMediaInput {
  type: "image" | "video";
  url: string; // URL công khai (Cloudinary) — FB tự fetch
}

export interface FacebookPublishInput {
  pageId: string; // accountExternalId của Page
  pageToken: string; // page access token (đã giải mã)
  message: string; // caption + hashtags
  media: FacebookMediaInput[];
}

/**
 * Đăng bài lên Facebook Page qua Graph API.
 *
 * Chọn endpoint theo media:
 *  - không media        → /{pageId}/feed        {message}
 *  - 1 ảnh              → /{pageId}/photos       {url, caption}
 *  - 1 video            → /{pageId}/videos       {file_url, description}
 *  - nhiều ảnh          → upload từng ảnh published=false → /feed attached_media
 *
 * YÊU CẦU: page token phải có quyền pages_manage_posts (cần bật trong FB App +
 * kết nối lại). Thiếu quyền → Graph trả lỗi → ném Error để target thành failed.
 */
@Injectable()
export class FacebookPublisher {
  private readonly GRAPH = "https://graph.facebook.com/v21.0";

  async publish(input: FacebookPublishInput): Promise<PublishResult> {
    const images = input.media.filter((m) => m.type === "image");
    const videos = input.media.filter((m) => m.type === "video");

    if (videos.length > 0) {
      return this.postVideo(input, videos[0].url);
    }
    if (images.length === 1) {
      return this.postSinglePhoto(input, images[0].url);
    }
    if (images.length > 1) {
      return this.postMultiPhoto(
        input,
        images.map((m) => m.url),
      );
    }
    return this.postText(input);
  }

  /** Bài chữ → /feed. external id dạng "{pageId}_{postId}". */
  private async postText(input: FacebookPublishInput): Promise<PublishResult> {
    const id = await this.graphPost(`${input.pageId}/feed`, {
      message: input.message,
      access_token: input.pageToken,
    });
    return this.resultFromPostId(id);
  }

  /** 1 ảnh → /photos (published=true mặc định). */
  private async postSinglePhoto(
    input: FacebookPublishInput,
    url: string,
  ): Promise<PublishResult> {
    const id = await this.graphPost(`${input.pageId}/photos`, {
      url,
      caption: input.message,
      access_token: input.pageToken,
    });
    // /photos trả về photo id; link xem ảnh:
    return { externalId: id, url: `https://www.facebook.com/${id}` };
  }

  private async postVideo(
    input: FacebookPublishInput,
    fileUrl: string,
  ): Promise<PublishResult> {
    const id = await this.graphPost(`${input.pageId}/videos`, {
      file_url: fileUrl,
      description: input.message,
      access_token: input.pageToken,
    });
    return { externalId: id, url: `https://www.facebook.com/${id}` };
  }

  /** Nhiều ảnh: upload từng ảnh không publish → đính vào 1 bài /feed. */
  private async postMultiPhoto(
    input: FacebookPublishInput,
    urls: string[],
  ): Promise<PublishResult> {
    const mediaFbids: string[] = [];
    for (const url of urls) {
      const photoId = await this.graphPost(`${input.pageId}/photos`, {
        url,
        published: "false",
        access_token: input.pageToken,
      });
      mediaFbids.push(photoId);
    }
    const body: Record<string, string> = {
      message: input.message,
      access_token: input.pageToken,
    };
    // attached_media[0]={"media_fbid":"..."} ...
    mediaFbids.forEach((fbid, i) => {
      body[`attached_media[${i}]`] = JSON.stringify({ media_fbid: fbid });
    });
    const id = await this.graphPost(`${input.pageId}/feed`, body);
    return this.resultFromPostId(id);
  }

  /** POST form-urlencoded tới Graph, trả về "id" hoặc "post_id". */
  private async graphPost(
    path: string,
    params: Record<string, string>,
  ): Promise<string> {
    const res = await fetch(`${this.GRAPH}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
    const json = (await res.json()) as {
      id?: string;
      post_id?: string;
      error?: { message?: string };
    };
    if (!res.ok || json.error || !(json.post_id ?? json.id)) {
      throw new Error(
        json.error?.message ?? `Facebook trả lỗi ${res.status} khi đăng`,
      );
    }
    return (json.post_id ?? json.id) as string;
  }

  private resultFromPostId(postId: string): PublishResult {
    return {
      externalId: postId,
      url: `https://www.facebook.com/${postId}`,
    };
  }
}
