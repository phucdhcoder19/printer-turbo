import "reflect-metadata";
import { config as loadEnv } from "dotenv";
import { DataSource } from "typeorm";

// Nạp .env cho TypeORM CLI (npm run migration:*)
loadEnv();

/**
 * DataSource dùng riêng cho TypeORM CLI (generate/run/revert mdigration).
 * App runtime dùng cấu hình trong app.module.ts.
 */
export const AppDataSource = new DataSource({
  type: "postgres",
  url:
    process.env.DATABASE_URL ??
    "postgres://mpt:mpt_secret@localhost:5432/mpt_marketing",
  // Glob: nạp mọi *.entity.ts trong src
  entities: [__dirname + "/../**/*.entity{.ts,.js}"],
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
  synchronize: false, // KHÔNG auto-sync — dùng migration để kiểm soát thay đổi
  // Mỗi migration 1 transaction riêng → migration thêm enum value commit xong
  // mới tới migration dùng enum đó (Postgres cấm dùng enum value mới cùng tx).
  migrationsTransactionMode: "each",
});
