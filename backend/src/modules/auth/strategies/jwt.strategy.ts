import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

// Nội dung "nhét" vào token khi đăng nhập
export interface JwtPayload {
  sub: string; // user id
  email: string;
  teamId: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      // Lấy token từ header: Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("jwt.secret"),
    });
  }

  // Giá trị return ở đây sẽ thành req.user
  validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      email: payload.email,
      teamId: payload.teamId,
      role: payload.role,
    };
  }
}
