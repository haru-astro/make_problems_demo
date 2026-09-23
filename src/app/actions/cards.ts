"use server";

import { revalidatePath } from "next/cache";
import { CardStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

const tagNamesSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .optional()
  .transform((names) => Array.from(new Set(names ?? [])));

const createCardSchema = z.object({
  title: z.string().trim().min(1, "タイトルを入力してください").max(200),
  status: z.enum(CardStatus).default(CardStatus.IDEA),
  assignedToId: z.string().trim().nullable().optional(),
  tagNames: tagNamesSchema,
});

const updateCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, "タイトルを入力してください").max(200),
  questionText: optionalText,
  option1: optionalText,
  option2: optionalText,
  option3: optionalText,
  option4: optionalText,
  correctOptionIndex: z.number().int().min(1).max(4).nullable().optional(),
  explanation: optionalText,
  assignedToId: z.string().trim().nullable().optional(),
  tagNames: tagNamesSchema,
});

export type ActionResult = { ok: true } | { ok: false; error: string };

function failure(error: unknown): ActionResult {
  if (error instanceof z.ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "入力内容を確認してください" };
  }
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "不明なエラーが発生しました" };
}

/** タグ名を Tag レコードに解決する（無ければ作成） */
async function connectTags(tagNames: string[]) {
  if (tagNames.length === 0) return [] as { id: string }[];

  await prisma.tag.createMany({
    data: tagNames.map((name) => ({ name })),
    skipDuplicates: true,
  });

  return prisma.tag.findMany({
    where: { name: { in: tagNames } },
    select: { id: true },
  });
}

export async function createCard(input: unknown): Promise<ActionResult> {
  try {
    const data = createCardSchema.parse(input);
    const currentUser = await requireCurrentUser();

    const tags = await connectTags(data.tagNames);

    const last = await prisma.card.findFirst({
      where: { status: data.status },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    await prisma.card.create({
      data: {
        title: data.title,
        status: data.status,
        order: (last?.order ?? -1) + 1,
        authorId: currentUser.id,
        assignedToId: data.assignedToId || null,
        tags: { connect: tags.map((tag) => ({ id: tag.id })) },
      },
    });

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateCard(input: unknown): Promise<ActionResult> {
  try {
    const data = updateCardSchema.parse(input);
    const tags = await connectTags(data.tagNames);

    await prisma.card.update({
      where: { id: data.id },
      data: {
        title: data.title,
        questionText: data.questionText ?? null,
        option1: data.option1 ?? null,
        option2: data.option2 ?? null,
        option3: data.option3 ?? null,
        option4: data.option4 ?? null,
        correctOptionIndex: data.correctOptionIndex ?? null,
        explanation: data.explanation ?? null,
        assignedToId: data.assignedToId || null,
        tags: { set: tags.map((tag) => ({ id: tag.id })) },
      },
    });

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

const moveCardSchema = z.object({
  cardId: z.string().min(1),
  toStatus: z.enum(CardStatus),
  toIndex: z.number().int().min(0),
});

/**
 * カードを別カラム / 別の位置へ移動し、関係するカラムの order を振り直す。
 */
export async function moveCard(input: unknown): Promise<ActionResult> {
  try {
    const { cardId, toStatus, toIndex } = moveCardSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({
        where: { id: cardId },
        select: { id: true, status: true },
      });
      if (!card) throw new Error("カードが見つかりません");

      const fromStatus = card.status;

      const destination = await tx.card.findMany({
        where: { status: toStatus, id: { not: cardId } },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });

      const index = Math.min(toIndex, destination.length);
      const nextIds = [
        ...destination.slice(0, index).map((c) => c.id),
        cardId,
        ...destination.slice(index).map((c) => c.id),
      ];

      await tx.card.update({
        where: { id: cardId },
        data: { status: toStatus },
      });

      // インタラクティブトランザクション内では順番に実行する
      for (const [order, id] of nextIds.entries()) {
        await tx.card.update({ where: { id }, data: { order } });
      }

      if (fromStatus !== toStatus) {
        const source = await tx.card.findMany({
          where: { status: fromStatus },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        });
        for (const [order, c] of source.entries()) {
          await tx.card.update({ where: { id: c.id }, data: { order } });
        }
      }
    });

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteCard(cardId: string): Promise<ActionResult> {
  try {
    await prisma.card.delete({ where: { id: z.string().min(1).parse(cardId) } });
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { ok: false, error: "カードが見つかりません" };
    }
    return failure(error);
  }
}
