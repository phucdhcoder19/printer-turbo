import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SocialAccountsController } from "./social-accounts.controller";
import { SocialAccountsService } from "./social-accounts.service";
import { SocialAccount } from "./entities/social-account.entity";
import { ConnectionLog } from "./entities/connection-log.entity";
import { PlatformConfig } from "../platform-configs/entities/platform-config.entity";
import { OauthState } from "./entities/oauth-state.entity";
import { FacebookProvider } from "./providers/facebook.provider";
import { TiktokProvider } from "./providers/tiktok.provider";
import { WordpressProvider } from "./providers/wordpress.provider";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SocialAccount,
      PlatformConfig,
      ConnectionLog,
      OauthState,
    ]),
  ],
  controllers: [SocialAccountsController],
  providers: [
    SocialAccountsService,
    FacebookProvider,
    TiktokProvider,
    WordpressProvider,
  ],
})
export class SocialAccountsModule {}
