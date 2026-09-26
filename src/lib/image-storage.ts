import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * 画像の実体を出し入れする窓口。
 *
 * 現在はデータベース（ImageBlob テーブル）に保存しているが、
 * Cloudflare へ移行する際は、このファイルの3つの関数を R2 版へ
 * 差し替えるだけで済むようにしてある。呼び出し側はキーしか知らない。
 */

/** 保存先のキーを作る。R2 へ移しても同じキーをそのまま使える */
export function createStorageKey() {
  return crypto.randomUUID();
}

export async function putImage(key: string, data: Uint8Array) {
  // Prisma の Bytes は ArrayBuffer 由来の Uint8Array を期待する
  const bytes = new Uint8Array(data);
  await prisma.imageBlob.create({ data: { key, data: bytes } });
}

export async function getImage(key: string) {
  const blob = await prisma.imageBlob.findUnique({
    where: { key },
    select: { data: true },
  });
  return blob ? new Uint8Array(blob.data) : null;
}

export async function deleteImage(key: string) {
  // すでに無い場合もあるため、件数は問わない
  await prisma.imageBlob.deleteMany({ where: { key } });
}

/** カードごと削除したときなど、複数の実体をまとめて片付ける */
export async function deleteImages(keys: string[]) {
  if (keys.length === 0) return;
  await prisma.imageBlob.deleteMany({ where: { key: { in: keys } } });
}
