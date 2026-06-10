import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed cấu hình nền tảng WordPress vào platform_configs (bật sẵn).
 *
 * Tách khỏi 1717900300000-AddWordpressPlatform (migration thêm enum value) vì
 * Postgres cấm dùng enum value mới cùng transaction vừa tạo nó. Migration này
 * chạy ở transaction sau nên dùng được 'wordpress'.
 *
 * Lưu ý: WordPress kết nối bằng Application Password (per-account), KHÔNG dùng
 * OAuth tập trung → các cột oauth_* để trống, chỉ cần display_name + is_enabled.
 */
export class SeedWordpressPlatformConfig1717900400000
  implements MigrationInterface
{
  name = 'SeedWordpressPlatformConfig1717900400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "platform_configs" ("platform","display_name","is_enabled")
      VALUES ('wordpress','WordPress',true)
      ON CONFLICT ("platform") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "platform_configs" WHERE "platform" = 'wordpress'`,
    );
  }
}
