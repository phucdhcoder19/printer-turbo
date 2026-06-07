import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Post } from './post.entity';
import { Media } from '../../media/entities/media.entity';

/**
 * Bảng nối posts ↔ media (nhiều–nhiều) kèm thứ tự hiển thị.
 */
@Entity('post_media')
@Unique(['postId', 'mediaId'])
export class PostMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Post, (post) => post.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column({ name: 'post_id' })
  postId: string;

  @ManyToOne(() => Media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media: Media;

  @Column({ name: 'media_id' })
  mediaId: string;

  @Column({ type: 'int', default: 0 })
  position: number;
}
