import { Injectable, NotFoundException } from "@nestjs/common";
import { PostStatus, TargetStatus } from "../../common/enums";
import { PostTarget } from "./entities/post-target.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Post } from "./entities/post.entity";
import { PostMedia } from "./entities/post-media.entity";
import { CreatePostDto } from "./dto/create-post.dto";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
// Quan hệ dùng chung khi đọc 1 bài (kèm targets + media đã gắn).
// (Thứ tự media theo position được sort ở client/khi publish, tránh phụ thuộc
//  order lồng quan hệ của TypeORM cho OneToMany.)
const POST_RELATIONS = {
  relations: { targets: true, media: { media: true } },
};
/**
 * Logic nghiệp vụ cho bài đăng.
 * Hiện CRUD vẫn là stub — nhưng computePostStatus() đã sẵn sàng để gọi
 * mỗi khi 1 post_target đổi trạng thái (sau khi đăng/scheduled/failed).
 */
@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(PostTarget) private targetRepo: Repository<PostTarget>,
    @InjectRepository(PostMedia) private postMediaRepo: Repository<PostMedia>,
    @InjectQueue("publish") private publishQueue: Queue,
  ) {}

  async create(
    createPostDto: CreatePostDto,
    teamId: string,
    userId: string,
  ): Promise<Post> {
    const targets = createPostDto.targets.map((t) =>
      this.targetRepo.create({
        platform: t.platform,
        caption: t.caption,
        hashtags: t.hashtags,
        scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null,
        status: t.scheduledAt ? TargetStatus.SCHEDULED : TargetStatus.DRAFT,
      }),
    );
    const post = this.postRepo.create({
      teamId,
      createdById: userId,
      title: createPostDto.title,
      baseCaption: createPostDto.baseCaption,
      contentPlanId: createPostDto.contentPlanId,
      targets,
    });
    post.status = this.computePostStatus(targets);
    const saved = await this.postRepo.save(post);
    await this.syncMedia(saved.id, createPostDto.mediaIds);
    const full = await this.findOne(saved.id);
    // Tạo job cho những target đã lên lịch (nếu có).
    await Promise.all(full.targets.map((t) => this.scheduleJob(t)));
    return full;
  }

  findAll(teamId: string): Promise<Post[]> {
    return this.postRepo.find({
      where: { teamId },
      ...POST_RELATIONS,
      order: { createdAt: "DESC" },
    });
  }

  // ----- LẤY 1 bài -----
  async findOne(id: string): Promise<Post> {
    const post = await this.postRepo.findOne({
      where: { id },
      ...POST_RELATIONS,
    });
    if (!post) throw new NotFoundException("Post not found");
    return post;
  }

  /**
   * Đồng bộ ảnh/video đính kèm: xoá post_media cũ → tạo lại theo thứ tự mediaIds.
   * mediaIds === undefined → không đụng tới (vd update không gửi field này).
   */
  private async syncMedia(postId: string, mediaIds?: string[]): Promise<void> {
    if (mediaIds === undefined) return;
    await this.postMediaRepo.delete({ postId });
    if (mediaIds.length === 0) return;
    await this.postMediaRepo.save(
      mediaIds.map((mediaId, position) =>
        this.postMediaRepo.create({ postId, mediaId, position }),
      ),
    );
  }

  async update(
    id: string,
    teamId: string,
    updatePostDto: Partial<CreatePostDto>,
  ): Promise<Post> {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: { targets: true },
    });
    if (!post) throw new NotFoundException("Post not found");
    if (post.teamId !== teamId)
      throw new NotFoundException("Post not found in your team");
    post.title = updatePostDto.title ?? post.title;
    post.baseCaption = updatePostDto.baseCaption ?? post.baseCaption;
    // Không cho update content
    // Thay TOÀN BỘ targets: xoá cũ → tạo mới (đơn giản, chắc đúng)
    if (updatePostDto.targets) {
      // Dọn job của target CŨ trước khi xoá (id cũ sắp biến mất)
      await Promise.all(
        post.targets.map((t) =>
          this.publishQueue.remove(`target-${t.id}`).catch(() => {}),
        ),
      );

      await this.targetRepo.delete({ postId: id });
      const targets = updatePostDto.targets?.map((t) =>
        this.targetRepo.create({
          postId: id,
          platform: t.platform,
          caption: t.caption ?? null,
          hashtags: t.hashtags ?? [],
          scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null,
          status: t.scheduledAt ? TargetStatus.SCHEDULED : TargetStatus.DRAFT,
        }),
      );
      post.targets = await this.targetRepo.save(targets);
    }
    post.status = this.computePostStatus(post.targets);
    await this.postRepo.save(post);
    await this.syncMedia(id, updatePostDto.mediaIds);
    const fullPost = await this.findOne(id);
    // Tạo job cho những target đã lên lịch (nếu có).
    await Promise.all(fullPost.targets.map((t) => this.scheduleJob(t)));
    return fullPost;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: { targets: true }, // cần targets để biết job nào phải dọn
    });
    if (!post) throw new NotFoundException("Post not found");
    // Xoá job đang chờ của các target trước khi xoá bài
    await Promise.all(
      post.targets.map((t) =>
        this.publishQueue.remove(`target-${t.id}`).catch(() => {}),
      ),
    );
    await this.postRepo.remove(post);
    return { success: true };
  }

  // ----- ĐỔI trạng thái 1 target → TÍNH LẠI status tổng -----
  async updateTargetStatus(
    targetId: string,
    status: TargetStatus,
  ): Promise<Post> {
    const target = await this.targetRepo.findOne({
      where: { id: targetId },
      relations: { post: true },
    });
    if (!target) throw new NotFoundException("Target not found");

    target.status = status;
    if (status === TargetStatus.PUBLISHED) target.publishedAt = new Date();
    await this.targetRepo.save(target);

    // Lấy lại TẤT CẢ targets của bài để tính status tổng cho đúng
    const all = await this.targetRepo.find({
      where: { postId: target.postId },
    });
    const post = target.post;
    post.status = this.computePostStatus(all);
    return this.postRepo.save(post);
  }

  /**
   * Tính trạng thái TỔNG của 1 bài từ trạng thái các nền tảng (targets).
   *
   * TẠI SAO tính ở service mà không hardcode hay để client set?
   * → posts.status là dữ liệu DẪN XUẤT từ post_targets. Nếu client tự set
   *   thì dễ lệch thực tế (vd client báo "published" nhưng FB thật ra failed).
   * → Gọi hàm này sau MỖI lần 1 target đổi trạng thái rồi lưu lại posts.status.
   *
   * Thứ tự ưu tiên (theo yêu cầu):
   *   1. Tất cả targets = published          → published
   *   2. Tất cả targets = failed             → failed
   *   3. Có cả published + failed            → partially_failed
   *   4. Có ít nhất 1 scheduled              → scheduled
   *   5. Còn lại                             → draft
   */
  computePostStatus(targets: Pick<PostTarget, "status">[]): PostStatus {
    // Không có target nào → vẫn là bản nháp
    if (targets.length === 0) return PostStatus.DRAFT;

    const has = (s: TargetStatus) => targets.some((t) => t.status === s);
    const all = (s: TargetStatus) => targets.every((t) => t.status === s);

    if (all(TargetStatus.PUBLISHED)) return PostStatus.PUBLISHED;
    if (all(TargetStatus.FAILED)) return PostStatus.FAILED;
    if (has(TargetStatus.PUBLISHED) && has(TargetStatus.FAILED)) {
      return PostStatus.PARTIALLY_FAILED;
    }
    if (has(TargetStatus.SCHEDULED)) return PostStatus.SCHEDULED;
    return PostStatus.DRAFT;
  }

  private async scheduleJob(target: PostTarget): Promise<void> {
    const jobId = `target-${target.id}`;
    await this.publishQueue.remove(jobId).catch(() => {}); // xoá job cũ nếu có (đổi giờ)
    if (target.status !== TargetStatus.SCHEDULED || !target.scheduledAt) return; // chỉ tạo job nếu đang ở trạng thái đã lên lịch
    const delay = target.scheduledAt.getTime() - Date.now();
    if (delay <= 0) {
      // Nếu thời gian đã qua, chạy ngay
      await this.publishQueue.add(
        "publishTarget",
        { targetId: target.id },
        { jobId, removeOnComplete: true, removeOnFail: true },
      );
    } else {
      // Tạo job với delay
      await this.publishQueue.add(
        "publish-target",
        { targetId: target.id },
        {
          delay,
          jobId, // 1 target = 1 job (tránh trùng)
          attempts: target.maxRetries || 3,
          backoff: { type: "exponential", delay: 60_000 }, // lỗi → thử lại sau 1', 2', 4'
          removeOnComplete: true,
        },
      );
    }
  }
}
