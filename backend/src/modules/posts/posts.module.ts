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
import { BullModule } from "@nestjs/bullmq";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { PublishProcessor } from "./publishers/publish.processor";
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
    BullModule.registerQueue({ name: "publish" }),
    // Đăng ký queue "publish" vào Bull Board để hiện trên dashboard /queues
    BullBoardModule.forFeature({ name: "publish", adapter: BullMQAdapter }),
  ],
  controllers: [PostsController],
  providers: [
    PostsService,
    PostPublishService,
    WordpressPublisher,
    FacebookPublisher,
    PublishProcessor,
  ],
  exports: [PostsService],
})
export class PostsModule {}
