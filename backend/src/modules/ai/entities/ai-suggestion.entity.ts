import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Post } from '../../posts/entities/post.entity';
import { User } from '../../users/entities/user.entity';
import { AiSuggestionType, Platform } from '../../../common/enums';

/**
 * Lưu lịch sử gợi ý của AI (caption / hashtags / giờ đăng tốt nhất).
 */
@Entity('ai_suggestions')
export class AiSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Post, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'post_id' })
  post: Post | null;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId: string | null;

  @Column({ type: 'enum', enum: AiSuggestionType })
  type: AiSuggestionType;

  @Column({ type: 'enum', enum: Platform, nullable: true })
  platform: Platform | null;

  @Column({ name: 'input_prompt', type: 'text', nullable: true })
  inputPrompt: string | null;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  model: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
