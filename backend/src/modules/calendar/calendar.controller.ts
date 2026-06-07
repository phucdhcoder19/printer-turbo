import { Controller, Get, Query } from '@nestjs/common';

// Route: /api/calendar
@Controller('calendar')
export class CalendarController {
  // GET /api/calendar?from=2026-06-01&to=2026-06-30
  @Get()
  getScheduled(@Query('from') from?: string, @Query('to') to?: string) {
    return {
      message: 'Calendar module — trả về các bài đã lên lịch trong khoảng thời gian',
      range: { from: from ?? null, to: to ?? null },
      items: [],
    };
  }
}
