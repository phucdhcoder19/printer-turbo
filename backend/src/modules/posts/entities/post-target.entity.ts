import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Post } from './post.entity';
import { SocialAccount } from '../../social-accounts/entities/social-account.entity';
import { PostAnalytics } from '../../analytics/entities/post-analytics.entity';
import { Platform, TargetStatus } from '../../../common/enums';

/**
 * 1 dòng = 1 bài đăng trên 1 nền tảng cụ thể.
 * Mỗi nền tảng có caption + hashtag + lịch + trạng thái RIÊNG.
 */
@Entity('post_targets')
@Unique(['postId', 'platform']) // mỗi nền tảng chỉ 1 target / bài
export class PostTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Post, (post) => post.targets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column({ name: 'post_id' })
  postId: string;

  @Column({ type: 'enum', enum: Platform })
  platform: Platform;

  @ManyToOne(() => SocialAccount, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'social_account_id' })
  socialAccount: SocialAccount | null;

  @Column({ name: 'social_account_id', type: 'uuid', nullable: true })
  socialAccountId: string | null;

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  // Postgres text[] — danh sách hashtag riêng cho nền tảng này
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  hashtags: string[];

  @Column({ type: 'enum', enum: TargetStatus, default: TargetStatus.DRAFT })
  status: TargetStatus;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'external_post_id', type: 'varchar', nullable: true })
  externalPostId: string | null;

  @Column({ name: 'external_url', type: 'varchar', nullable: true })
  externalUrl: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  // ----- Retry (cho Bull job đăng bài) -----
  // Job: nếu retry_count < max_retries → thử lại; ngược lại → status = failed.
  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', type: 'int', default: 3 })
  maxRetries: number;

  @Column({ name: 'last_error_at', type: 'timestamptz', nullable: true })
  lastErrorAt: Date | null;

  // ----- Số liệu "hiện tại" (denormalized cache) -----
  // Lịch sử theo thời gian nằm ở post_analytics. 5 cột này lưu số MỚI NHẤT
  // để list/calendar đọc nhanh, khỏi phải quét bảng lịch sử mỗi lần render.
  @Column({ name: 'current_likes', type: 'int', default: 0 })
  currentLikes: number;

  @Column({ name: 'current_comments', type: 'int', default: 0 })
  currentComments: number;

  @Column({ name: 'current_shares', type: 'int', default: 0 })
  currentShares: number;

  @Column({ name: 'current_views', type: 'int', default: 0 })
  currentViews: number;

  @Column({ name: 'current_reach', type: 'int', default: 0 })
  currentReach: number;

  @Column({ name: 'metrics_synced_at', type: 'timestamptz', nullable: true })
  metricsSyncedAt: Date | null;

  @OneToMany(() => PostAnalytics, (a) => a.postTarget)
  analytics: PostAnalytics[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
