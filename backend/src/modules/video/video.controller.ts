import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { VideoService } from './video.service';
import { CreateVideoDto } from './dto/create-video.dto';

/**
 * Route prefix đầy đủ: /api/video/...
 * (global prefix "api" trong main.ts + "video" ở đây)
 *
 * React gọi:
 *   POST /api/video/videos      → tạo video
 *   GET  /api/video/tasks/:id   → hỏi tiến độ
 */
@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('videos')
  createVideo(@Body() dto: CreateVideoDto) {
    return this.videoService.createVideo(dto);
  }

  @Get('tasks/:id')
  getTask(@Param('id') id: string) {
    return this.videoService.getTask(id);
  }
}
