import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { Post } from "../posts/entities/post.entity";
import { PostTarget } from "../posts/entities/post-target.entity";
import { Media } from "../media/entities/media.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostTarget, Media])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
