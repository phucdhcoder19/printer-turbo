import { Module } from "@nestjs/common";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";
import { Post } from "./entities/post.entity";
import { PostTarget } from "./entities/post-target.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
/**
 * Quản lý bài đăng marketing (Facebook, TikTok, Instagram, YouTube).
 * TODO (bước sau): thêm TypeOrmModule.forFeature([Post, PostPlatform])
 * khi đã viết entity.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Post, PostTarget])],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
