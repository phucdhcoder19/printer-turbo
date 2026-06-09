import { createParamDecorator, ExecutionContext } from "@nestjs/common";

// Dùng: me(@CurrentUser() user) { ... }
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().user,
);
