import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { TargetStatus } from "../../common/enums";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

interface RequestUser {
  userId: string;
  teamId: string;
  role: string;
}

// Route: /api/posts
@UseGuards(JwtAuthGuard)
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  //Route: api/posts
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePostDto) {
    return this.postsService.create(dto, user.teamId, user.userId);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.postsService.findAll(user.teamId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.postsService.findOne(id);
  }

  @Patch("target/:targetId/status")
  updateTargetStatus(
    @Param("targetId") targetId: string,
    @Body("status") status: TargetStatus,
  ) {
    return this.postsService.updateTargetStatus(targetId, status);
  }
}
