import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

/**
 * Quản lý bài đăng marketing (Facebook, TikTok, Instagram, YouTube).
 * TODO (bước sau): thêm TypeOrmModule.forFeature([Post, PostPlatform])
 * khi đã viết entity.
 */
@Module({
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
