import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";

import { SocialAccount } from "./entities/social-account.entity";
import { ConnectionLog } from "./entities/connection-log.entity";
import { OauthState } from "./entities/oauth-state.entity";
import { PlatformConfig } from "../platform-configs/entities/platform-config.entity";
import {
  ConnectionStatus,
  ConnectionLogAction,
  Platform,
  OauthStateStatus,
} from "../../common/enums";
import { encrypt } from "../../common/crypto.util";
import { FacebookProvider } from "./providers/facebook.provider";
import { TiktokProvider } from "./providers/tiktok.provider";
import { WordpressProvider } from "./providers/wordpress.provider";
import { ConnectWordpressDto } from "./dto/connect-wordpress.dto";

/** Object trả ra client — KHÔNG kèm token (tránh rò rỉ). */
export interface SocialAccountDto {
  id: string;
  teamId: string;
  platform: Platform;
  accountName: string;
  connectionStatus: ConnectionStatus;
  connectedAt: Date | null;
  profileImageUrl: string | null;
}

@Injectable()
export class SocialAccountsService {
  // Nền tảng dùng OAuth redirect (FB/TikTok). Còn lại: mock hoặc credential.
  private readonly STATE_TTL_MS = 5 * 60 * 1000; // oauth_state sống 5 phút

  constructor(
    @InjectRepository(SocialAccount)
    private readonly accountRepo: Repository<SocialAccount>,
    @InjectRepository(PlatformConfig)
    private readonly configRepo: Repository<PlatformConfig>,
    @InjectRepository(ConnectionLog)
    private readonly logRepo: Repository<ConnectionLog>,
    @InjectRepository(OauthState)
    private readonly oauthStateRepo: Repository<OauthState>,
    private readonly config: ConfigService,
    private readonly facebook: FacebookProvider,
    private readonly tiktok: TiktokProvider,
    private readonly wordpress: WordpressProvider,
  ) {}

  // ──────────────────────────────────────────────
  // READ
  // ──────────────────────────────────────────────

  /** Danh sách kênh của team (bỏ kênh đã revoke). */
  async list(teamId: string): Promise<SocialAccountDto[]> {
    const accounts = await this.accountRepo.find({
      where: { teamId, connectionStatus: Not(ConnectionStatus.REVOKED) },
      order: { createdAt: "ASC" },
    });
    return accounts.map((a) => this.toDto(a));
  }

  /** Đếm "x / N connected" cho thanh tiến độ. */
  async status(teamId: string) {
    const connected = await this.accountRepo.count({
      where: { teamId, connectionStatus: ConnectionStatus.CONNECTED },
    });
    const total = await this.configRepo.count({ where: { isEnabled: true } });
    return { connected, total };
  }

  // ──────────────────────────────────────────────
  // CONNECT — OAuth redirect (Facebook, TikTok)
  // ──────────────────────────────────────────────

  /** Trả URL để frontend redirect user sang nền tảng. */
  async getConnectUrl(
    platform: Platform,
    teamId: string,
    userId: string,
  ): Promise<{ authorizeUrl: string }> {
    await this.assertPlatformEnabled(platform);

    if (platform === Platform.FACEBOOK) {
      this.assertConfigured(
        ["facebook.appId", "facebook.appSecret"],
        "Facebook App (FB_APP_ID / FB_APP_SECRET)",
      );
      const state = await this.createOauthState(teamId, userId, platform);
      return { authorizeUrl: this.facebook.getAuthorizeUrl(state) };
    }

    if (platform === Platform.TIKTOK) {
      this.assertConfigured(
        ["tiktok.clientKey", "tiktok.clientSecret"],
        "TikTok App (TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET)",
      );
      const state = await this.createOauthState(teamId, userId, platform);
      return { authorizeUrl: this.tiktok.getAuthorizeUrl(state) };
    }

    throw new BadRequestException(
      `Nền tảng ${platform} không dùng OAuth redirect`,
    );
  }

  /**
   * Xử lý callback OAuth (PUBLIC route — không có JWT). Danh tính khôi phục từ
   * state_token. Trả về URL redirect ngược về frontend kèm kết quả.
   */
  async handleCallback(
    platform: Platform,
    code: string,
    state: string,
  ): Promise<string> {
    const frontend = this.config.get<string>(
      "frontendUrl",
      "http://localhost:5173",
    );
    const redirect = (result: string) =>
      `${frontend}/settings?channel=${platform}&result=${result}`;

    // 1) Kiểm state (chống CSRF) + đúng nền tảng + chưa hết hạn
    const oauthState = await this.validateState(state, platform);
    if (!oauthState) return redirect("error");

    try {
      if (platform === Platform.FACEBOOK) {
        const { accessToken } = await this.facebook.exchangeCode(code);
        const pages = await this.facebook.getPages(accessToken);
        if (!pages.length) return redirect("no_pages");

        // Mỗi Page = 1 social_account (token riêng từng Page).
        for (const page of pages) {
          await this.upsertAccount({
            teamId: oauthState.teamId,
            platform,
            accountExternalId: page.id,
            accountName: page.name,
            accessToken: page.accessToken,
            profileImageUrl: page.pictureUrl,
            performedById: oauthState.userId,
            logDetails: `Kết nối Facebook Page: ${page.name}`,
          });
        }
        return redirect("connected");
      }

      if (platform === Platform.TIKTOK) {
        const token = await this.tiktok.exchangeCode(code);
        const user = await this.tiktok.getUserInfo(token.accessToken);
        await this.upsertAccount({
          teamId: oauthState.teamId,
          platform,
          accountExternalId: token.openId,
          accountName: user.displayName,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          tokenExpiresAt: token.expiresIn
            ? new Date(Date.now() + token.expiresIn * 1000)
            : null,
          grantedScopes: token.scope ? token.scope.split(/[ ,]+/) : [],
          profileImageUrl: user.avatarUrl,
          performedById: oauthState.userId,
          logDetails: `Kết nối TikTok: ${user.displayName}`,
        });
        return redirect("connected");
      }

      return redirect("error");
    } catch {
      return redirect("error");
    }
  }

  // ──────────────────────────────────────────────
  // CONNECT — WordPress (Application Password, không redirect)
  // ──────────────────────────────────────────────

  async connectWordpress(
    teamId: string,
    userId: string,
    dto: ConnectWordpressDto,
  ): Promise<SocialAccountDto> {
    await this.assertPlatformEnabled(Platform.WORDPRESS);

    const siteUrl = this.wordpress.normalizeSiteUrl(dto.siteUrl);
    // Verify credentials — ném UnauthorizedException nếu sai (NestJS trả 401).
    const user = await this.wordpress.verifyCredentials(
      siteUrl,
      dto.username,
      dto.appPassword,
    );

    // Lưu credential Basic Auth (đã mã hoá ở upsert) để sau này đăng bài.
    const credential = this.wordpress.buildCredential(
      dto.username,
      dto.appPassword,
    );

    return this.upsertAccount({
      teamId,
      platform: Platform.WORDPRESS,
      accountExternalId: `${siteUrl}#${user.id}`, // duy nhất theo site + user
      accountName: `${user.name} (${siteUrl.replace(/^https?:\/\//, "")})`,
      accessToken: credential,
      profileImageUrl: user.avatarUrl,
      profileUrl: siteUrl,
      metadata: { siteUrl, wpUserId: user.id, username: dto.username },
      performedById: userId,
      logDetails: `Kết nối WordPress: ${siteUrl}`,
    });
  }

  // ──────────────────────────────────────────────
  // CONNECT — Mock (instagram/youtube/threads/twitter chưa có OAuth thật)
  // ──────────────────────────────────────────────

  async connect(
    platform: Platform,
    teamId: string,
    accountName?: string,
  ): Promise<SocialAccountDto> {
    // Chặn dùng mock cho nền tảng đã có luồng thật.
    if (
      platform === Platform.FACEBOOK ||
      platform === Platform.TIKTOK ||
      platform === Platform.WORDPRESS
    ) {
      throw new BadRequestException(
        `Nền tảng ${platform} kết nối qua luồng riêng, không dùng mock connect`,
      );
    }
    const config = await this.assertPlatformEnabled(platform);

    return this.upsertAccount({
      teamId,
      platform,
      accountExternalId: `mock-${platform}-${randomBytes(4).toString("hex")}`,
      accountName: accountName ?? `Tài khoản ${config.displayName}`,
      grantedScopes: config.oauthScopes,
      logDetails: `Kết nối ${config.displayName} (mock)`,
    });
  }

  // ──────────────────────────────────────────────
  // DISCONNECT
  // ──────────────────────────────────────────────

  /** Ngắt kết nối (soft: giữ bản ghi, đổi status = revoked). */
  async disconnect(id: string, teamId: string): Promise<{ success: boolean }> {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) throw new NotFoundException("Không tìm thấy kênh");
    // Chỉ cho ngắt kênh thuộc team của mình.
    if (account.teamId !== teamId) {
      throw new NotFoundException("Không tìm thấy kênh trong team của bạn");
    }

    account.connectionStatus = ConnectionStatus.REVOKED;
    account.disconnectedAt = new Date();
    account.accessToken = null; // xoá token khi ngắt
    account.refreshToken = null;
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

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────

  /** Sinh state_token + lưu oauth_states (PENDING, hết hạn 5'). */
  private async createOauthState(
    teamId: string,
    userId: string,
    platform: Platform,
  ): Promise<string> {
    const stateToken = randomBytes(24).toString("hex");
    await this.oauthStateRepo.save(
      this.oauthStateRepo.create({
        teamId,
        userId,
        platform,
        stateToken,
        status: OauthStateStatus.PENDING,
        expiresAt: new Date(Date.now() + this.STATE_TTL_MS),
      }),
    );
    return stateToken;
  }

  /** Kiểm state hợp lệ (PENDING, đúng platform, chưa hết hạn) → đánh dấu COMPLETED. */
  private async validateState(
    stateToken: string,
    platform: Platform,
  ): Promise<OauthState | null> {
    const oauthState = await this.oauthStateRepo.findOne({
      where: { stateToken },
    });
    if (
      !oauthState ||
      oauthState.platform !== platform ||
      oauthState.status !== OauthStateStatus.PENDING ||
      oauthState.expiresAt < new Date()
    ) {
      return null;
    }
    oauthState.status = OauthStateStatus.COMPLETED;
    await this.oauthStateRepo.save(oauthState);
    return oauthState;
  }

  /**
   * Tạo mới hoặc cập nhật 1 social_account theo unique
   * (team_id, platform, account_external_id) → đánh dấu connected + ghi log.
   * Token (nếu có) được MÃ HOÁ trước khi lưu.
   */
  private async upsertAccount(params: {
    teamId: string;
    platform: Platform;
    accountExternalId: string;
    accountName: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    tokenExpiresAt?: Date | null;
    grantedScopes?: string[];
    profileImageUrl?: string | null;
    profileUrl?: string | null;
    metadata?: Record<string, unknown> | null;
    performedById?: string | null;
    logDetails: string;
  }): Promise<SocialAccountDto> {
    const platformConfig = await this.configRepo.findOne({
      where: { platform: params.platform },
    });

    let account = await this.accountRepo.findOne({
      where: {
        teamId: params.teamId,
        platform: params.platform,
        accountExternalId: params.accountExternalId,
      },
    });
    if (!account) {
      account = this.accountRepo.create({
        teamId: params.teamId,
        platform: params.platform,
        accountExternalId: params.accountExternalId,
      });
    }

    account.accountName = params.accountName;
    account.platformConfigId = platformConfig?.id ?? null;
    account.connectionStatus = ConnectionStatus.CONNECTED;
    account.connectedAt = new Date();
    account.disconnectedAt = null;
    account.tokenError = null;
    account.isActive = true;
    if (params.accessToken !== undefined) {
      account.accessToken =
        params.accessToken === null
          ? null
          : this.encryptToken(params.accessToken);
    }
    if (params.refreshToken !== undefined) {
      account.refreshToken =
        params.refreshToken === null
          ? null
          : this.encryptToken(params.refreshToken);
    }
    if (params.tokenExpiresAt !== undefined) {
      account.tokenExpiresAt = params.tokenExpiresAt;
    }
    if (params.grantedScopes !== undefined) {
      account.grantedScopes = params.grantedScopes;
    }
    if (params.profileImageUrl !== undefined) {
      account.profileImageUrl = params.profileImageUrl;
    }
    if (params.profileUrl !== undefined) {
      account.profileUrl = params.profileUrl;
    }
    if (params.metadata !== undefined) {
      account.metadata = params.metadata;
    }

    const saved = await this.accountRepo.save(account);

    await this.logRepo.save(
      this.logRepo.create({
        socialAccountId: saved.id,
        action: ConnectionLogAction.CONNECTED,
        performedById: params.performedById ?? null,
        details: params.logDetails,
      }),
    );

    return this.toDto(saved);
  }

  /** Mã hoá token bằng ENCRYPTION_KEY (.env). Ném lỗi rõ nếu chưa cấu hình. */
  private encryptToken(raw: string): string {
    return encrypt(raw, this.config.get<string>("encryptionKey", ""));
  }

  /** Bảo đảm nền tảng tồn tại + đang bật; trả về config. */
  private async assertPlatformEnabled(
    platform: Platform,
  ): Promise<PlatformConfig> {
    const config = await this.configRepo.findOne({ where: { platform } });
    if (!config || !config.isEnabled) {
      throw new BadRequestException(`Nền tảng ${platform} chưa được bật`);
    }
    return config;
  }

  /** Bảo đảm các key cấu hình (env) đã có giá trị, nếu thiếu báo lỗi rõ ràng. */
  private assertConfigured(keys: string[], hint: string): void {
    const missing = keys.some((k) => !this.config.get<string>(k));
    if (missing) {
      throw new BadRequestException(
        `Chưa cấu hình ${hint} trong .env của backend`,
      );
    }
  }

  /** Map entity → DTO an toàn (loại token nhạy cảm). */
  private toDto(a: SocialAccount): SocialAccountDto {
    return {
      id: a.id,
      teamId: a.teamId,
      platform: a.platform,
      accountName: a.accountName,
      connectionStatus: a.connectionStatus,
      connectedAt: a.connectedAt,
      profileImageUrl: a.profileImageUrl,
    };
  }
}
