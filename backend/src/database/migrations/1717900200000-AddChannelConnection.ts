import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema kết nối kênh kiểu Buffer:
 *  - platform_configs   : cấu hình OAuth mỗi nền tảng
 *  - social_accounts    : thêm cột trạng thái kết nối + profile + metadata
 *  - oauth_states       : tracking phiên OAuth (chống CSRF)
 *  - connection_logs    : lịch sử kết nối/ngắt/refresh
 */
export class AddChannelConnection1717900200000 implements MigrationInterface {
  name = 'AddChannelConnection1717900200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ----- enum types -----
    await queryRunner.query(
      `CREATE TYPE "connection_status" AS ENUM ('connected','expired','revoked','pending')`,
    );
    await queryRunner.query(
      `CREATE TYPE "oauth_state_status" AS ENUM ('pending','completed','failed','expired')`,
    );
    await queryRunner.query(
      `CREATE TYPE "connection_log_action" AS ENUM ('connected','disconnected','token_refreshed','token_expired','reconnected')`,
    );

    // ----- platform_configs -----
    await queryRunner.query(`
      CREATE TABLE "platform_configs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "platform" "platform" NOT NULL UNIQUE,
        "display_name" varchar NOT NULL,
        "icon_url" varchar,
        "oauth_client_id" text,
        "oauth_client_secret" text,
        "oauth_scopes" text[] NOT NULL DEFAULT '{}',
        "oauth_auth_url" varchar,
        "oauth_token_url" varchar,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ----- mở rộng social_accounts -----
    await queryRunner.query(`
      ALTER TABLE "social_accounts"
        ADD COLUMN "granted_scopes" text[] NOT NULL DEFAULT '{}',
        ADD COLUMN "platform_config_id" uuid REFERENCES "platform_configs"("id") ON DELETE SET NULL,
        ADD COLUMN "connection_status" "connection_status" NOT NULL DEFAULT 'pending',
        ADD COLUMN "connected_at" TIMESTAMPTZ,
        ADD COLUMN "disconnected_at" TIMESTAMPTZ,
        ADD COLUMN "last_token_refresh" TIMESTAMPTZ,
        ADD COLUMN "token_error" text,
        ADD COLUMN "profile_url" varchar,
        ADD COLUMN "profile_image_url" varchar,
        ADD COLUMN "metadata" jsonb
    `);
    await queryRunner.query(
      `ALTER TABLE "social_accounts" ADD CONSTRAINT "uq_social_accounts_team_platform_external" UNIQUE ("team_id","platform","account_external_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_social_accounts_team_status" ON "social_accounts" ("team_id","connection_status")`,
    );

    // ----- oauth_states -----
    await queryRunner.query(`
      CREATE TABLE "oauth_states" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "platform" "platform" NOT NULL,
        "state_token" varchar NOT NULL UNIQUE,
        "redirect_url" varchar,
        "status" "oauth_state_status" NOT NULL DEFAULT 'pending',
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_oauth_states_expires" ON "oauth_states" ("expires_at")`,
    );

    // ----- connection_logs -----
    await queryRunner.query(`
      CREATE TABLE "connection_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "social_account_id" uuid NOT NULL REFERENCES "social_accounts"("id") ON DELETE CASCADE,
        "action" "connection_log_action" NOT NULL,
        "performed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "details" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_connection_logs_account_time" ON "connection_logs" ("social_account_id","created_at")`,
    );

    // ----- seed platform_configs (6 nền tảng, bật sẵn) -----
    await queryRunner.query(`
      INSERT INTO "platform_configs" ("platform","display_name","is_enabled") VALUES
        ('facebook','Facebook',true),
        ('instagram','Instagram',true),
        ('tiktok','TikTok',true),
        ('youtube','YouTube',true),
        ('threads','Threads',true),
        ('twitter','X (Twitter)',true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "connection_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "oauth_states"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_social_accounts_team_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_accounts" DROP CONSTRAINT IF EXISTS "uq_social_accounts_team_platform_external"`,
    );
    await queryRunner.query(`
      ALTER TABLE "social_accounts"
        DROP COLUMN IF EXISTS "metadata",
        DROP COLUMN IF EXISTS "profile_image_url",
        DROP COLUMN IF EXISTS "profile_url",
        DROP COLUMN IF EXISTS "token_error",
        DROP COLUMN IF EXISTS "last_token_refresh",
        DROP COLUMN IF EXISTS "disconnected_at",
        DROP COLUMN IF EXISTS "connected_at",
        DROP COLUMN IF EXISTS "connection_status",
        DROP COLUMN IF EXISTS "platform_config_id",
        DROP COLUMN IF EXISTS "granted_scopes"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "platform_configs"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "connection_log_action"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "oauth_state_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "connection_status"`);
  }
}
