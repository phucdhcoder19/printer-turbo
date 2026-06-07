import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';

/**
 * AI tối ưu content: viết caption, gợi ý hashtag, đề xuất giờ đăng.
 * Có thể tái dùng LLM của FastAPI (Ollama) qua proxy, hoặc gọi provider riêng.
 */
@Module({
  controllers: [AiController],
})
export class AiModule {}
