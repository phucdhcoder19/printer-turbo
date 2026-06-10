import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thêm nền tảng "wordpress" vào enum "platform".
 *
 * QUAN TRỌNG: tách riêng migration này (chỉ ADD VALUE) khỏi migration seed
 * platform_configs. Postgres KHÔNG cho dùng một enum value mới trong cùng
 * transaction vừa thêm nó. Vì data-source đặt migrationsTransactionMode='each',
 * mỗi migration là 1 transaction riêng → migration sau (seed) mới dùng được
 * 'wordpress'. Xem mẫu 1717900100000-AddPlatformEnumValues.ts.
 */
export class AddWordpressPlatform1717900300000 implements MigrationInterface {
  name = 'AddWordpressPlatform1717900300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "platform" ADD VALUE IF NOT EXISTS 'wordpress'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres không hỗ trợ xoá value khỏi enum type → không revert được.
    // Muốn gỡ phải tạo enum mới rồi đổi cột — bỏ qua ở đây.
  }
}
