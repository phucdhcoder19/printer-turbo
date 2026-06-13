import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AiService } from "./ai.service";
import type { Platform } from "../../common/enums";

interface RequestUser {
  userId: string;
  teamId: string;
  role: string;
}

@UseGuards(JwtAuthGuard)
@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  // POST /api/ai/caption  { topic, platform?, tone? }
  @Post("caption")
  caption(
    @CurrentUser() user: RequestUser,
    @Body() body: { topic?: string; platform?: Platform; tone?: string },
  ) {
    return this.ai.caption(
      { topic: body.topic ?? "", platform: body.platform, tone: body.tone },
      user.userId,
    );
  }
}
