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
} from "@nestjs/common";
import { SocialAccountsService } from "./social-accounts.service";
import { ConnectChannelDto } from "./dto/connect-channel.dto";
import { Platform } from "../../common/enums";

// Route prefix: /api/social-accounts
@Controller("social-accounts")
export class SocialAccountsController {
  constructor(private readonly service: SocialAccountsService) {}

  @Get()
  list(@Query("teamId", ParseUUIDPipe) teamId: string) {
    return this.service.list(teamId);
  }

  @Get("status")
  status(@Query("teamId", ParseUUIDPipe) teamId: string) {
    return this.service.status(teamId);
  }

  // ParseEnumPipe tự chặn nếu platform không hợp lệ
  @Post("connect/:platform")
  connect(
    @Param("platform", new ParseEnumPipe(Platform)) platform: Platform,
    @Body() dto: ConnectChannelDto,
  ) {
    return this.service.connect(platform, dto);
  }

  @Delete(":id")
  disconnect(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.disconnect(id);
  }
}
