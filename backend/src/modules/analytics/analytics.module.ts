import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';

/**
 * Thống kê hiệu quả bài đăng (likes, comments, shares) theo từng nền tảng.
 */
@Module({
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
