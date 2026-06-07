import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { TargetStatus } from "../../common/enums";

// Route: /api/posts
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  //Route: api/posts
  @Post()
  create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }

  @Get()
  findAll() {
    return this.postsService.findAll();
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
