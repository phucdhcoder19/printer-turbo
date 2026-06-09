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

@Module({
  imports: [
    // 1) Config toàn cục (đọc .env + configuration.ts)
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
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
  ],
})
export class AppModule {}
