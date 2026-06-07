import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SocialAccountsController } from "./social-accounts.controller";
import { SocialAccountsService } from "./social-accounts.service";
import { SocialAccount } from "./entities/social-account.entity";
import { ConnectionLog } from "./entities/connection-log.entity";
import { PlatformConfig } from "../platform-configs/entities/platform-config.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([SocialAccount, PlatformConfig, ConnectionLog]),
  ],
  controllers: [SocialAccountsController],
  providers: [SocialAccountsService],
})
export class SocialAccountsModule {}
