-- 画像の実体を別テーブルへ移す。
-- Cloudflare へ移行する際は ImageBlob の代わりに R2 を使うため、
-- CardImage 側には参照キー（storageKey）だけを残す。

-- CreateTable
CREATE TABLE "ImageBlob" (
    "key" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageBlob_pkey" PRIMARY KEY ("key")
);

-- 既存の画像データを移す（キーは既存の画像IDをそのまま使う）
INSERT INTO "ImageBlob" ("key", "data", "createdAt")
SELECT "id", "data", "createdAt" FROM "CardImage";

-- AlterTable: まず既存行を埋められるよう NULL 許容で追加する
ALTER TABLE "CardImage" ADD COLUMN "storageKey" TEXT;
UPDATE "CardImage" SET "storageKey" = "id" WHERE "storageKey" IS NULL;
ALTER TABLE "CardImage" ALTER COLUMN "storageKey" SET NOT NULL;
ALTER TABLE "CardImage" DROP COLUMN "data";

-- CreateIndex
CREATE UNIQUE INDEX "CardImage_storageKey_key" ON "CardImage"("storageKey");
