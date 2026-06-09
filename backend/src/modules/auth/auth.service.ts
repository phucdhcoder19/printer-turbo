import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";

import { User } from "../users/entities/user.entity";
import { Team } from "../teams/entities/team.entity";
import { UserRole } from "../../common/enums";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException("Email đã được dùng");

    // Tạo team riêng cho người đăng ký, gán họ làm admin
    const team = await this.teamRepo.save(
      this.teamRepo.create({ name: dto.teamName ?? `${dto.name}'s team` }),
    );

    // BĂM mật khẩu — KHÔNG BAO GIỜ lưu plaintext
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.userRepo.save(
      this.userRepo.create({
        teamId: team.id,
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: UserRole.ADMIN,
      }),
    );
    return this.sign(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    // Báo lỗi GIỐNG NHAU cho cả 2 trường hợp → tránh lộ email nào tồn tại
    if (!user) throw new UnauthorizedException("Email hoặc mật khẩu sai");

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Email hoặc mật khẩu sai");

    return this.sign(user);
  }

  private sign(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      teamId: user.teamId,
      role: user.role,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
      },
    };
  }
}
