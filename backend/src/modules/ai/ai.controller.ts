import { Body, Controller, Post } from '@nestjs/common';

// Route: /api/ai
@Controller('ai')
export class AiController {
  // POST /api/ai/caption  { topic, platform }
  @Post('caption')
  suggestCaption(@Body() body: { topic?: string; platform?: string }) {
    return {
      message: 'AI module — sinh caption/hashtag sẽ được implement ở bước sau',
      input: body,
      caption: '',
      hashtags: [],
    };
  }
}
