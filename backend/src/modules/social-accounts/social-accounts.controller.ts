import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";

import { SocialAccountsService } from "./social-accounts.service";
import { ConnectChannelDto } from "./dto/connect-channel.dto";
import { ConnectWordpressDto } from "./dto/connect-wordpress.dto";
import { Platform } from "../../common/enums";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

interface RequestUser {
  userId: string;
  teamId: string;
  role: string;
}

// Route prefix: /api/social-accounts
@Controller("social-accounts")
export class SocialAccountsController {
  constructor(private readonly service: SocialAccountsService) {}

  // ──────────────────────────────────────────────
  // Các route user khởi tạo → JWT-guard, lấy team/user từ token.
  // ──────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.service.list(user.teamId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("status")
  status(@CurrentUser() user: RequestUser) {
    return this.service.status(user.teamId);
  }

  /** Lấy URL OAuth để frontend redirect sang nền tảng (facebook/tiktok). */
  @UseGuards(JwtAuthGuard)
  @Get("connect/:platform/url")
  getConnectUrl(
    @CurrentUser() user: RequestUser,
    @Param("platform", new ParseEnumPipe(Platform)) platform: Platform,
  ) {
    return this.service.getConnectUrl(platform, user.teamId, user.userId);
  }

  /** WordPress: kết nối bằng Application Password (không redirect). */
  @UseGuards(JwtAuthGuard)
  @Post("connect/wordpress")
  connectWordpress(
    @CurrentUser() user: RequestUser,
    @Body() dto: ConnectWordpressDto,
  ) {
    return this.service.connectWordpress(user.teamId, user.userId, dto);
  }

  /** Mock connect cho nền tảng chưa có OAuth thật (instagram/youtube/...). */
  @UseGuards(JwtAuthGuard)
  @Post("connect/:platform")
  connect(
    @CurrentUser() user: RequestUser,
    @Param("platform", new ParseEnumPipe(Platform)) platform: Platform,
    @Body() dto: ConnectChannelDto,
  ) {
    return this.service.connect(platform, user.teamId, dto.accountName);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  disconnect(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.disconnect(id, user.teamId);
  }

  // ──────────────────────────────────────────────
  // Callback OAuth → PUBLIC (không guard).
  // Browser redirect top-level KHÔNG mang header Authorization; danh tính
  // khôi phục từ state_token. Sau xử lý → redirect ngược về frontend.
  // ──────────────────────────────────────────────

  @Get(":platform/callback")
  async callback(
    @Param("platform", new ParseEnumPipe(Platform)) platform: Platform,
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    const url = await this.service.handleCallback(platform, code, state);
    return res.redirect(url);
  }
}
