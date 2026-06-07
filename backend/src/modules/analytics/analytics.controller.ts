import { Controller, Get } from '@nestjs/common';

// Route: /api/analytics
@Controller('analytics')
export class AnalyticsController {
  @Get('summary')
  summary() {
    return {
      message: 'Analytics module — tổng hợp likes/comments/shares ở bước sau',
      totals: { likes: 0, comments: 0, shares: 0 },
    };
  }
}
