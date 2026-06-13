import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AnalyticsService } from "./analytics.service";

interface RequestUser {
  userId: string;
  teamId: string;
  role: string;
}

@UseGuards(JwtAuthGuard) // teamId lấy từ token, KHÔNG nhận từ query
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("summary")
  summary(@CurrentUser() user: RequestUser, @Query("range") range = "7d") {
    return this.analytics.summary(user.teamId, range);
  }

  @Get("engagement")
  engagement(@CurrentUser() user: RequestUser, @Query("range") range = "7d") {
    return this.analytics.engagementByDay(user.teamId, range);
  }

  @Get("by-platform")
  byPlatform(@CurrentUser() user: RequestUser, @Query("range") range = "7d") {
    return this.analytics.byPlatform(user.teamId, range);
  }

  @Get("top-posts")
  topPosts(
    @CurrentUser() user: RequestUser,
    @Query("range") range = "7d",
    @Query("limit") limit = "5",
  ) {
    return this.analytics.topPosts(
      user.teamId,
      range,
      parseInt(limit, 10) || 5,
    );
  }
}
