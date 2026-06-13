import { join } from "path";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import configuration from "./config/configuration";
import { VideoModule } from "./modules/video/video.module";
import { PostsModule } from "./modules/posts/posts.module";
import { CalendarModule } from "./modules/calendar/calendar.module";
import { AiModule } from "./modules/ai/ai.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { SocialAccountsModule } from "./modules/social-accounts/social-accounts.module";
import { AuthModule } from "./modules/auth/auth.module";
import { MediaModule } from "./modules/media/media.module";
import { BullModule } from "@nestjs/bullmq";
import { BullBoardModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";
import { AnalyticsService } from "./modules/analytics/analytics.service";

@Module({
  imports: [
    // 1) Config toàn cục (đọc .env + configuration.ts)
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // Luôn nạp backend/.env theo đường dẫn TUYỆT ĐỐI (không phụ thuộc thư mục
      // chạy). __dirname = backend/src (dev) hoặc backend/dist (build) → '..'
      // đều ra thư mục backend → backend/.env.
      envFilePath: join(__dirname, "..", ".env"),
    }),

    // 2) Kết nối PostgreSQL qua TypeORM
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.get<string>("database.url"),
        // Nạp mọi *.entity.ts trong src
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        migrations: [__dirname + "/database/migrations/*{.ts,.js}"],
        // Dùng MIGRATION để kiểm soát schema (npm run migration:run).
        // synchronize=false để app không tự ý sửa cấu trúc DB.
        synchronize: false,
      }),
    }),

    // 3) Các module nghiệp vụ
    VideoModule, // proxy sang FastAPI
    PostsModule, // quản lý bài đăng marketing
    CalendarModule, // lên lịch theo tuần/tháng
    AiModule, // AI tối ưu content
    AnalyticsModule, // thống kê hiệu quả
    SocialAccountsModule,
    AuthModule,
    MediaModule,
    BullModule.forRoot({
      // Kết nối Redis (dùng chung với FastAPI)
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
      },
    }),

    // 4) Bull Board — dashboard web xem/retry/xoá job của hàng đợi.
    // Truy cập tại http://localhost:3000/api/queues
    // (route "/queues" + global prefix "/api" ở main.ts → "/api/queues").
    // ⚠️ Không có auth — chỉ dùng cho môi trường dev cục bộ.
    BullBoardModule.forRoot({
      route: "/queues",
      adapter: ExpressAdapter,
    }),
  ],
})
export class AppModule {}
