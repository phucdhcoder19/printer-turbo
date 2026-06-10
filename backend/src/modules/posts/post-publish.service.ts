import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";

import { Post } from "./entities/post.entity";
import { PostTarget } from "./entities/post-target.entity";
import { SocialAccount } from "../social-accounts/entities/social-account.entity";
import { ConnectionStatus, Platform, TargetStatus } from "../../common/enums";
import { decrypt } from "../../common/crypto.util";
import { PostsService } from "./posts.service";
import {
  FacebookPublisher,
  type FacebookMediaInput,
} from "./publishers/facebook-publisher";
import { WordpressPublisher } from "./publishers/wordpress-publisher";

/**
 * Điều phối ĐĂNG NGAY 1 bài lên tất cả nền tảng (target) của nó.
 * Mỗi target độc lập: 1 cái lỗi không chặn cái khác → post.status rollup lại.
 */
@Injectable()
export class PostPublishService {
  private readonly logger = new Logger(PostPublishService.name);

  constructor(
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(PostTarget)
    private readonly targetRepo: Repository<PostTarget>,
    @InjectRepository(SocialAccount)
    private readonly accountRepo: Repository<SocialAccount>,
    private readonly config: ConfigService,
    private readonly posts: PostsService,
    private readonly facebook: FacebookPublisher,
    private readonly wordpress: WordpressPublisher,
  ) {}

  async publishPost(
    postId: string,
    teamId: string,
    _userId: string,
  ): Promise<Post> {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: { targets: true, media: { media: true } },
    });
    if (!post) throw new NotFoundException("Không tìm thấy bài đăng");
    if (post.teamId !== teamId) {
      throw new NotFoundException("Bài đăng không thuộc team của bạn");
    }

    // Media đính kèm (đã sort theo position ở quan hệ) → dạng dùng cho publisher.
    const media: FacebookMediaInput[] = (post.media ?? [])
      .sort((a, b) => a.position - b.position)
      .filter((pm) => pm.media)
      .map((pm) => ({
        type: pm.media.type === "video" ? "video" : "image",
        url: pm.media.url,
      }));
    const firstImageUrl = media.find((m) => m.type === "image")?.url ?? null;

    for (const target of post.targets) {
      // Đã đăng rồi thì bỏ qua (tránh đăng trùng).
      if (target.status === TargetStatus.PUBLISHED) continue;
      await this.publishTarget(target, post, media, firstImageUrl);
    }

    // Tính lại trạng thái tổng từ TẤT CẢ target rồi lưu.
    const fresh = await this.targetRepo.find({ where: { postId } });
    post.status = this.posts.computePostStatus(fresh);
    await this.postRepo.save(post);

    return this.posts.findOne(postId);
  }

  /** Đăng 1 target → cập nhật trạng thái target (published/failed). */
  private async publishTarget(
    target: PostTarget,
    post: Post,
    media: FacebookMediaInput[],
    firstImageUrl: string | null,
  ): Promise<void> {
    try {
      const account = await this.resolveAccount(post.teamId, target.platform);
      const token = this.decryptToken(account);

      let externalId: string;
      let externalUrl: string;

      if (target.platform === Platform.WORDPRESS) {
        const siteUrl =
          (account.metadata?.siteUrl as string | undefined) ??
          account.profileUrl ??
          "";
        const res = await this.wordpress.publish({
          siteUrl,
          authHeader: token, // WP lưu sẵn chuỗi "Basic ..." (đã giải mã)
          title: post.title,
          contentHtml: post.baseCaption ?? target.caption ?? "",
          imageUrl: firstImageUrl,
        });
        externalId = res.externalId;
        externalUrl = res.url;
      } else if (target.platform === Platform.FACEBOOK) {
        // Gộp ảnh ĐÍNH KÈM + ảnh CHÈN trong "Nội dung" (baseCaption) thành 1 bài.
        // Không gộp thì ảnh nhúng trong HTML bị htmlToText cắt mất → caption ra
        // 1 bài chữ, ảnh không lên được → trông như tách 1 content thành 2 bài.
        const fbMedia = this.dedupeMedia([
          ...media,
          ...this.extractEmbeddedImages(post.baseCaption),
        ]);
        const res = await this.facebook.publish({
          pageId: account.accountExternalId ?? "",
          pageToken: token,
          message: this.buildMessage(target),
          media: fbMedia,
        });
        externalId = res.externalId;
        externalUrl = res.url;
      } else {
        throw new Error(
          `Chưa hỗ trợ đăng tự động cho ${target.platform}`,
        );
      }

      target.status = TargetStatus.PUBLISHED;
      target.publishedAt = new Date();
      target.externalPostId = externalId;
      target.externalUrl = externalUrl;
      target.socialAccountId = account.id;
      target.errorMessage = null;
    } catch (err) {
      const message = (err as Error).message ?? "Đăng thất bại";
      this.logger.warn(
        `Đăng ${target.platform} thất bại (post ${post.id}): ${message}`,
      );
      target.status = TargetStatus.FAILED;
      target.errorMessage = message;
      target.retryCount += 1;
      target.lastErrorAt = new Date();
    }
    await this.targetRepo.save(target);
  }

  /** Tìm tài khoản đã kết nối (connected) đầu tiên của nền tảng cho team. */
  private async resolveAccount(
    teamId: string,
    platform: Platform,
  ): Promise<SocialAccount> {
    const account = await this.accountRepo.findOne({
      where: {
        teamId,
        platform,
        connectionStatus: ConnectionStatus.CONNECTED,
      },
      order: { createdAt: "ASC" },
    });
    if (!account) {
      throw new Error(`Chưa kết nối kênh ${platform}`);
    }
    return account;
  }

  /** Giải mã token đã lưu; rỗng → bắt kết nối lại. */
  private decryptToken(account: SocialAccount): string {
    if (!account.accessToken) {
      throw new Error("Token rỗng — hãy kết nối lại kênh");
    }
    return decrypt(account.accessToken, this.config.get<string>("encryptionKey", ""));
  }

  /** Caption (text) + hashtags → message cho Facebook. */
  private buildMessage(target: PostTarget): string {
    const tags = (target.hashtags ?? [])
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .join(" ");
    return [target.caption ?? "", tags].filter(Boolean).join("\n\n");
  }

  /**
   * Bóc URL ảnh nhúng trong nội dung HTML (nút "Chèn ảnh" của RichTextEditor).
   * Các URL này là link công khai Cloudinary nên Facebook tự fetch được.
   */
  private extractEmbeddedImages(html: string | null): FacebookMediaInput[] {
    if (!html) return [];
    const out: FacebookMediaInput[] = [];
    const re = /<img[^>]+src=["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      out.push({ type: "image", url: m[1] });
    }
    return out;
  }

  /** Loại media trùng URL (ảnh vừa đính kèm vừa chèn trong nội dung). */
  private dedupeMedia(items: FacebookMediaInput[]): FacebookMediaInput[] {
    const seen = new Set<string>();
    const out: FacebookMediaInput[] = [];
    for (const m of items) {
      if (seen.has(m.url)) continue;
      seen.add(m.url);
      out.push(m);
    }
    return out;
  }
}
