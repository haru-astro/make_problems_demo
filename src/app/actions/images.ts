"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  createStorageKey,
  deleteImage,
  putImage,
} from "@/lib/image-storage";
import type { ActionResult } from "@/app/actions/cards";

/** 受け付ける画像形式。SVG はスクリプトを埋め込めるため除外する */
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;

// "use server" ファイルは関数以外を export できないため、定数はローカルに置く。
/** 1枚あたりの上限。ブラウザ側で縮小済みの画像を想定している */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const addImageSchema = z.object({
  cardId: z.string().min(1),
  mimeType: z.enum(ALLOWED_MIME),
  // データ URL ではなく base64 本体のみ
  dataBase64: z.string().min(1),
  width: z.number().int().positive().max(20000).nullable().optional(),
  height: z.number().int().positive().max(20000).nullable().optional(),
  caption: z.string().trim().max(200).nullable().optional(),
});

function failure(error: unknown, fallback: string): ActionResult {
  if (error instanceof z.ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "入力内容を確認してください" };
  }
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

export async function addCardImage(input: unknown): Promise<ActionResult> {
  try {
    const data = addImageSchema.parse(input);
    const bytes = Buffer.from(data.dataBase64, "base64");

    if (bytes.length === 0) {
      return { ok: false, error: "画像を読み込めませんでした" };
    }
    if (bytes.length > MAX_IMAGE_BYTES) {
      return { ok: false, error: "画像が大きすぎます（4MBまで）" };
    }

    const last = await prisma.cardImage.findFirst({
      where: { cardId: data.cardId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    // 実体を先に保存し、メタ情報の登録に失敗したら実体も片付ける
    const storageKey = createStorageKey();
    await putImage(storageKey, bytes);

    try {
      await prisma.cardImage.create({
        data: {
          cardId: data.cardId,
          storageKey,
          mimeType: data.mimeType,
          width: data.width ?? null,
          height: data.height ?? null,
          size: bytes.length,
          caption: data.caption ?? null,
          order: (last?.order ?? -1) + 1,
        },
      });
    } catch (error) {
      await deleteImage(storageKey);
      throw error;
    }

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error, "画像を追加できませんでした");
  }
}

const updateCaptionSchema = z.object({
  imageId: z.string().min(1),
  caption: z
    .string()
    .trim()
    .max(200)
    .transform((value) => (value.length === 0 ? null : value)),
});

export async function updateImageCaption(input: unknown): Promise<ActionResult> {
  try {
    const data = updateCaptionSchema.parse(input);
    await prisma.cardImage.update({
      where: { id: data.imageId },
      data: { caption: data.caption },
    });
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error, "キャプションを保存できませんでした");
  }
}

export async function deleteCardImage(imageId: string): Promise<ActionResult> {
  try {
    const id = z.string().min(1).parse(imageId);
    const image = await prisma.cardImage.delete({
      where: { id },
      select: { storageKey: true },
    });

    await deleteImage(image.storageKey);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error, "画像を削除できませんでした");
  }
}
