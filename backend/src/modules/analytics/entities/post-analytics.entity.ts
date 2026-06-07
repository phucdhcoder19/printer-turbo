import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PostTarget } from '../../posts/entities/post-target.entity';

/**
 * Snapshot số liệu của 1 target tại 1 thời điểm.
 * Mỗi lần kéo số liệu từ nền tảng → thêm 1 dòng → vẽ được biểu đồ tăng trưởng.
 */
@Entity('post_analytics')
// Index thật là (post_target_id, fetched_at DESC) — định nghĩa trong migration
// (decorator không biểu diễn được DESC). Phục vụ query "snapshot mới nhất".
@Index('idx_post_analytics_target_time', ['postTargetId', 'fetchedAt'])
export class PostAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PostTarget, (t) => t.analytics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_target_id' })
  postTarget: PostTarget;

  @Column({ name: 'post_target_id' })
  postTargetId: string;

  @Column({ type: 'int', default: 0 })
  likes: number;

  @Column({ type: 'int', default: 0 })
  comments: number;

  @Column({ type: 'int', default: 0 })
  shares: number;

  @Column({ type: 'int', default: 0 })
  views: number;

  @Column({ type: 'int', default: 0 })
  reach: number;

  @Column({ name: 'fetched_at', type: 'timestamptz', default: () => 'now()' })
  fetchedAt: Date;
}
