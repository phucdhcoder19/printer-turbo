import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThanOrEqual, Repository } from "typeorm";
import { Post } from "../posts/entities/post.entity";
import { PostTarget } from "../posts/entities/post-target.entity";
import { Media } from "../media/entities/media.entity";
import { MediaSource, TargetStatus } from "../../common/enums";

// Tương tác = like + comment + share (lấy từ cache current_* trên post_targets)
const ENGAGEMENT = "t.current_likes + t.current_comments + t.current_shares";

// '7d' | '30d' | '90d' → mốc thời gian "from" (now - N ngày)
function rangeToDate(range: string): Date {
  const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
  const from = new Date();
  from.setDate(from.getDate() - days);
  return from;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(PostTarget) private targetRepo: Repository<PostTarget>,
    @InjectRepository(Media) private mediaRepo: Repository<Media>,
  ) {}

  // 4 số cho stat card ở Dashboard
  async summary(teamId: string, range: string) {
    const from = rangeToDate(range);

    const posts = await this.postRepo.count({
      where: { teamId, createdAt: MoreThanOrEqual(from) },
    });

    const videos = await this.mediaRepo.count({
      where: {
        teamId,
        source: MediaSource.MPT_GENERATED,
        createdAt: MoreThanOrEqual(from),
      },
    });

    // sắp đăng = target đã lên lịch & giờ đăng còn ở tương lai
    const scheduled = await this.targetRepo
      .createQueryBuilder("t")
      .innerJoin("t.post", "p")
      .where("p.team_id = :teamId", { teamId })
      .andWhere("t.status = :st", { st: TargetStatus.SCHEDULED })
      .andWhere("t.scheduled_at > NOW()")
      .getCount();

    const eng = await this.targetRepo
      .createQueryBuilder("t")
      .innerJoin("t.post", "p")
      .select(`COALESCE(SUM(${ENGAGEMENT}), 0)`, "total")
      .where("p.team_id = :teamId", { teamId })
      .andWhere("t.status = :st", { st: TargetStatus.PUBLISHED })
      .andWhere("t.published_at >= :from", { from })
      .getRawOne<{ total: string }>();

    // trends (% so kỳ trước) tạm bỏ — FE tự ẩn badge khi thiếu. Thêm sau nếu cần.
    return { posts, engagement: Number(eng?.total ?? 0), videos, scheduled };
  }

  // [{ day: '10/06', value: 145 }, ...] — tổng tương tác mỗi ngày
  async engagementByDay(teamId: string, range: string) {
    const from = rangeToDate(range);
    const rows = await this.targetRepo
      .createQueryBuilder("t")
      .innerJoin("t.post", "p")
      .select(`TO_CHAR(t.published_at, 'DD/MM')`, "day") // format ngay trong SQL, khỏi lo timezone
      .addSelect(`SUM(${ENGAGEMENT})`, "value")
      .where("p.team_id = :teamId", { teamId })
      .andWhere("t.status = :st", { st: TargetStatus.PUBLISHED })
      .andWhere("t.published_at >= :from", { from })
      .groupBy("DATE(t.published_at)")
      .addGroupBy(`TO_CHAR(t.published_at, 'DD/MM')`)
      .orderBy("DATE(t.published_at)", "ASC")
      .getRawMany<{ day: string; value: string }>();

    return rows.map((r) => ({ day: r.day, value: Number(r.value) }));
  }

  // [{ platform: 'facebook', engagement: 4200 }, ...]
  async byPlatform(teamId: string, range: string) {
    const from = rangeToDate(range);
    const rows = await this.targetRepo
      .createQueryBuilder("t")
      .innerJoin("t.post", "p")
      .select("t.platform", "platform")
      .addSelect(`SUM(${ENGAGEMENT})`, "engagement")
      .where("p.team_id = :teamId", { teamId })
      .andWhere("t.status = :st", { st: TargetStatus.PUBLISHED })
      .andWhere("t.published_at >= :from", { from })
      .groupBy("t.platform")
      .getRawMany<{ platform: string; engagement: string }>();

    return rows.map((r) => ({
      platform: r.platform,
      engagement: Number(r.engagement),
    }));
  }

  // [{ id, title, platform, engagement }, ...] — top theo tương tác
  async topPosts(teamId: string, range: string, limit: number) {
    const from = rangeToDate(range);
    const rows = await this.targetRepo
      .createQueryBuilder("t")
      .innerJoin("t.post", "p")
      .select("t.id", "id") // id của target → key duy nhất cho bảng FE
      .addSelect("p.title", "title")
      .addSelect("t.platform", "platform")
      .addSelect(ENGAGEMENT, "engagement")
      .where("p.team_id = :teamId", { teamId })
      .andWhere("t.status = :st", { st: TargetStatus.PUBLISHED })
      .andWhere("t.published_at >= :from", { from })
      .orderBy("engagement", "DESC")
      .limit(limit)
      .getRawMany<{
        id: string;
        title: string;
        platform: string;
        engagement: string;
      }>();

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      platform: r.platform,
      engagement: Number(r.engagement),
    }));
  }
}
