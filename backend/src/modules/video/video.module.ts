import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { VideoController } from './video.controller';
import { VideoService } from './video.service';

@Module({
  // HttpModule cung cấp HttpService (axios) để gọi sang FastAPI
  imports: [
    HttpModule.register({
      timeout: 15000,      // 15s — tạo video trả task_id ngay nên không cần lâu
      maxRedirects: 3,
    }),
  ],
  controllers: [VideoController],
  providers: [VideoService],
})
export class VideoModule {}
