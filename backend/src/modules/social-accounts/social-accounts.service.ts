import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";

import { SocialAccount } from "./entities/social-account.entity";
import { ConnectionLog } from "./entities/connection-log.entity";
import { PlatformConfig } from "../platform-configs/entities/platform-config.entity";
import {
  ConnectionStatus,
  ConnectionLogAction,
  Platform,
} from "../../common/enums";

@Injectable()
export class SocialAccountsService {
  constructor(
    @InjectRepository(SocialAccount)
    private readonly accountRepo: Repository<SocialAccount>,
    @InjectRepository(PlatformConfig)
    private readonly configRepo: Repository<PlatformConfig>,
    @InjectRepository(ConnectionLog)
    private readonly logRepo: Repository<ConnectionLog>,
  ) {}

  /** Danh sách kênh của team (bỏ kênh đã revoke) */
  list(teamId: string) {
    return this.accountRepo.find({
      where: { teamId, connectionStatus: Not(ConnectionStatus.REVOKED) },
      order: { createdAt: "ASC" },
    });
  }

  /** Đếm "x / N connected" cho thanh tiến độ */
  async status(teamId: string) {
    const connected = await this.accountRepo.count({
      where: { teamId, connectionStatus: ConnectionStatus.CONNECTED },
    });
    const total = await this.configRepo.count({ where: { isEnabled: true } });
    return { connected, total };
  }

  /** Kết nối 1 nền tảng (MOCK: tạo thẳng account connected) */
  async connect(platform: Platform, dto: ConnectChannelDtoLike) {
    const config = await this.configRepo.findOne({ where: { platform } });
    if (!config || !config.isEnabled) {
      throw new BadRequestException(`Nền tảng ${platform} chưa được bật`);
    }

    const account = this.accountRepo.create({
      teamId: dto.teamId,
      platform,
      accountName: dto.accountName ?? `Tài khoản ${config.displayName}`,
      platformConfigId: config.id,
      connectionStatus: ConnectionStatus.CONNECTED,
      connectedAt: new Date(),
      grantedScopes: config.oauthScopes, // thực tế: lấy từ token nền tảng trả về
    });
    const saved = await this.accountRepo.save(account);

    // Ghi audit log
    await this.logRepo.save(
      this.logRepo.create({
        socialAccountId: saved.id,
        action: ConnectionLogAction.CONNECTED,
        details: `Kết nối ${config.displayName} (mock)`,
      }),
    );

    return saved;
  }

  /** Ngắt kết nối (soft: giữ bản ghi, đổi status = revoked) */
  async disconnect(id: string) {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) throw new NotFoundException("Không tìm thấy kênh");

    account.connectionStatus = ConnectionStatus.REVOKED;
    account.disconnectedAt = new Date();
    await this.accountRepo.save(account);

    await this.logRepo.save(
      this.logRepo.create({
        socialAccountId: account.id,
        action: ConnectionLogAction.DISCONNECTED,
        details: "Người dùng ngắt kết nối",
      }),
    );

    return { success: true };
  }
}

// kiểu nhẹ cho tham số connect (khớp ConnectChannelDto)
interface ConnectChannelDtoLike {
  teamId: string;
  accountName?: string;
}
