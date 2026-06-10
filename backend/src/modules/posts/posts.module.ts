import { Module } from "@nestjs/common";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";
import { PostPublishService } from "./post-publish.service";
import { Post } from "./entities/post.entity";
import { PostTarget } from "./entities/post-target.entity";
import { PostMedia } from "./entities/post-media.entity";
import { Media } from "../media/entities/media.entity";
import { SocialAccount } from "../social-accounts/entities/social-account.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WordpressPublisher } from "./publishers/wordpress-publisher";
import { FacebookPublisher } from "./publishers/facebook-publisher";

/**
 * Quản lý bài đăng marketing + đăng thật lên nền tảng (WordPress, Facebook).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      PostTarget,
      PostMedia,
      Media,
      SocialAccount,
    ]),
  ],
  controllers: [PostsController],
  providers: [
    PostsService,
    PostPublishService,
    WordpressPublisher,
    FacebookPublisher,
  ],
  exports: [PostsService],
})
export class PostsModule {}
