import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration khởi tạo toàn bộ schema marketing.
 * Tạo theo thứ tự phụ thuộc khoá ngoại (teams trước, bảng tham chiếu sau).
 */
export class InitMarketingSchema1717900000000 implements MigrationInterface {
  name = 'InitMarketingSchema1717900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // uuid_generate_v4() cần extension này
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ----- ENUM types -----
    await queryRunner.query(
      `CREATE TYPE "user_role" AS ENUM ('admin','editor','creator')`,
    );
    await queryRunner.query(
      `CREATE TYPE "platform" AS ENUM ('facebook','tiktok','instagram','youtube')`,
    );
    await queryRunner.query(
      `CREATE TYPE "post_status" AS ENUM ('draft','scheduled','published','partially_failed','failed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "target_status" AS ENUM ('draft','scheduled','publishing','published','failed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "media_type" AS ENUM ('image','video')`,
    );
    await queryRunner.query(
      `CREATE TYPE "media_source" AS ENUM ('upload','mpt_generated')`,
    );
    await queryRunner.query(
      `CREATE TYPE "ai_suggestion_type" AS ENUM ('caption','hashtags','best_time')`,
    );
    await queryRunner.query(
      `CREATE TYPE "content_plan_status" AS ENUM ('draft','active','archived')`,
    );

    // ----- teams -----
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ----- users -----
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
        "email" varchar NOT NULL UNIQUE,
        "password_hash" varchar NOT NULL,
        "name" varchar NOT NULL,
        "role" "user_role" NOT NULL DEFAULT 'creator',
        "avatar_url" varchar,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ----- social_accounts -----
    await queryRunner.query(`
      CREATE TABLE "social_accounts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
        "platform" "platform" NOT NULL,
        "account_name" varchar NOT NULL,
        "account_external_id" varchar,
        "access_token" text,
        "refresh_token" text,
        "token_expires_at" TIMESTAMPTZ,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ----- media -----
    await queryRunner.query(`
      CREATE TABLE "media" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
        "uploaded_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "type" "media_type" NOT NULL,
        "source" "media_source" NOT NULL DEFAULT 'upload',
        "mpt_task_id" varchar,
        "url" varchar NOT NULL,
        "thumbnail_url" varchar,
        "file_name" varchar,
        "file_size" bigint,
        "width" int,
        "height" int,
        "duration" double precision,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ----- content_plans (tạo trước posts vì posts tham chiếu tới nó) -----
    await queryRunner.query(`
      CREATE TABLE "content_plans" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
        "name" varchar NOT NULL,
        "description" text,
        "start_date" date,
        "end_date" date,
        "status" "content_plan_status" NOT NULL DEFAULT 'draft',
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ----- posts -----
    await queryRunner.query(`
      CREATE TABLE "posts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "content_plan_id" uuid REFERENCES "content_plans"("id") ON DELETE SET NULL,
        "title" varchar NOT NULL,
        "base_caption" text,
        "status" "post_status" NOT NULL DEFAULT 'draft',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ----- post_targets -----
    await queryRunner.query(`
      CREATE TABLE "post_targets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
        "platform" "platform" NOT NULL,
        "social_account_id" uuid REFERENCES "social_accounts"("id") ON DELETE SET NULL,
        "caption" text,
        "hashtags" text[] NOT NULL DEFAULT '{}',
        "status" "target_status" NOT NULL DEFAULT 'draft',
        "scheduled_at" TIMESTAMPTZ,
        "published_at" TIMESTAMPTZ,
        "external_post_id" varchar,
        "external_url" varchar,
        "error_message" text,
        "retry_count" int NOT NULL DEFAULT 0,
        "max_retries" int NOT NULL DEFAULT 3,
        "last_error_at" TIMESTAMPTZ,
        "current_likes" int NOT NULL DEFAULT 0,
        "current_comments" int NOT NULL DEFAULT 0,
        "current_shares" int NOT NULL DEFAULT 0,
        "current_views" int NOT NULL DEFAULT 0,
        "current_reach" int NOT NULL DEFAULT 0,
        "metrics_synced_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_post_targets_post_platform" UNIQUE ("post_id","platform")
      )
    `);

    // ----- post_media (join) -----
    await queryRunner.query(`
      CREATE TABLE "post_media" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
        "media_id" uuid NOT NULL REFERENCES "media"("id") ON DELETE CASCADE,
        "position" int NOT NULL DEFAULT 0,
        CONSTRAINT "uq_post_media" UNIQUE ("post_id","media_id")
      )
    `);

    // ----- post_analytics -----
    await queryRunner.query(`
      CREATE TABLE "post_analytics" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "post_target_id" uuid NOT NULL REFERENCES "post_targets"("id") ON DELETE CASCADE,
        "likes" int NOT NULL DEFAULT 0,
        "comments" int NOT NULL DEFAULT 0,
        "shares" int NOT NULL DEFAULT 0,
        "views" int NOT NULL DEFAULT 0,
        "reach" int NOT NULL DEFAULT 0,
        "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    // DESC trên fetched_at → query "số liệu mới nhất của 1 target" cực nhanh:
    //   SELECT * FROM post_analytics WHERE post_target_id=$1
    //   ORDER BY fetched_at DESC LIMIT 1;
    await queryRunner.query(
      `CREATE INDEX "idx_post_analytics_target_time" ON "post_analytics" ("post_target_id", "fetched_at" DESC)`,
    );

    // ----- ai_suggestions -----
    await queryRunner.query(`
      CREATE TABLE "ai_suggestions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "post_id" uuid REFERENCES "posts"("id") ON DELETE CASCADE,
        "type" "ai_suggestion_type" NOT NULL,
        "platform" "platform",
        "input_prompt" text,
        "output" jsonb,
        "model" varchar,
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xoá theo thứ tự NGƯỢC để không vướng khoá ngoại
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_suggestions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_analytics"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_media"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_targets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "posts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "content_plans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "media"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "social_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "teams"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "content_plan_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ai_suggestion_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "media_source"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "media_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "target_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "post_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "platform"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role"`);
  }
}
