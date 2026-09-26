import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// マイグレーション用の DIRECT_URL が未設定・空の場合は DATABASE_URL で代用する。
// 設定漏れでデプロイ全体が止まるのを防ぐための保険で、本番では両方設定するのが望ましい。
const directUrl = process.env.DIRECT_URL?.trim();
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!directUrl && databaseUrl) {
  process.env.DIRECT_URL = databaseUrl;
  console.warn(
    "[prisma] DIRECT_URL が設定されていないため DATABASE_URL で代用します。" +
      "コネクションプール経由のURLではマイグレーションが失敗することがあるため、" +
      "本番では直接接続用の DIRECT_URL を設定してください。",
  );
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
