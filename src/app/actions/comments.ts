"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import type { ActionResult } from "@/app/actions/cards";

const addCommentSchema = z.object({
  cardId: z.string().min(1),
  content: z.string().trim().min(1, "コメントを入力してください").max(2000),
});

export async function addComment(input: unknown): Promise<ActionResult> {
  try {
    const data = addCommentSchema.parse(input);
    const currentUser = await requireCurrentUser();

    await prisma.comment.create({
      data: {
        cardId: data.cardId,
        content: data.content,
        userId: currentUser.id,
      },
    });

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        error: error.issues[0]?.message ?? "入力内容を確認してください",
      };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "コメントを追加できませんでした",
    };
  }
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  try {
    const id = z.string().min(1).parse(commentId);
    const currentUser = await requireCurrentUser();

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!comment) return { ok: false, error: "コメントが見つかりません" };
    if (comment.userId !== currentUser.id) {
      return { ok: false, error: "自分のコメントのみ削除できます" };
    }

    await prisma.comment.delete({ where: { id } });
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "コメントを削除できませんでした",
    };
  }
}
