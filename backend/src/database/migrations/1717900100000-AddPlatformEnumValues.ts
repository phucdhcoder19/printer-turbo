import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thêm 2 nền tảng mới vào enum "platform": threads, twitter.
 *
 * QUAN TRỌNG: tách riêng migration này vì Postgres KHÔNG cho dùng enum value
 * mới trong cùng transaction vừa thêm nó. Migration sau (tạo bảng + seed) chạy
 * ở transaction khác nên mới dùng được 'threads'/'twitter'.
 */
export class AddPlatformEnumValues1717900100000 implements MigrationInterface {
  name = 'AddPlatformEnumValues1717900100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "platform" ADD VALUE IF NOT EXISTS 'threads'`,
    );
    await queryRunner.query(
      `ALTER TYPE "platform" ADD VALUE IF NOT EXISTS 'twitter'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres không hỗ trợ xoá value khỏi enum type → không revert được.
    // Muốn gỡ phải tạo enum mới rồi đổi cột — bỏ qua ở đây.
  }
}
