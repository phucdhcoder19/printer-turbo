import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';

/**
 * Lên lịch đăng bài theo tuần/tháng (calendar view).
 * TODO: dùng Redis (BullMQ) để đẩy job đăng bài đúng giờ scheduled_at.
 */
@Module({
  controllers: [CalendarController],
})
export class CalendarModule {}
