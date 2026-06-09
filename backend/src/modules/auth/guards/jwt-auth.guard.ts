import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// Gắn guard này lên route → bắt buộc có token hợp lệ
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
