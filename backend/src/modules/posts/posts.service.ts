import { Injectable, NotFoundException } from "@nestjs/common";
import { PostStatus, TargetStatus } from "../../common/enums";
import { PostTarget } from "./entities/post-target.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Post } from "./entities/post.entity";
import { CreatePostDto } from "./dto/create-post.dto";
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
  ) {}

  async create(createPostDto: CreatePostDto): Promise<Post> {
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
      teamId: createPostDto.teamId,
      title: createPostDto.title,
      baseCaption: createPostDto.baseCaption,
      contentPlanId: createPostDto.contentPlanId,
      targets,
    });
    post.status = this.computePostStatus(targets);
    return this.postRepo.save(post);
  }

  findAll(): Promise<Post[]> {
    return this.postRepo.find({ relations: { targets: true } });
  }

  // ----- LẤY 1 bài -----
  async findOne(id: string): Promise<Post> {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: { targets: true },
    });
    if (!post) throw new NotFoundException("Post not found");
    return post;
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
}
