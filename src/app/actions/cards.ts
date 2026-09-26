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
        select: { id: true, status: true, groupId: true },
      });
      if (!card) throw new Error("カードが見つかりません");

      // セット（大問）に属するカードは常に一緒に移動する
      const movingCards = card.groupId
        ? await tx.card.findMany({
            where: { groupId: card.groupId },
            orderBy: [{ groupOrder: "asc" }, { order: "asc" }],
            select: { id: true, status: true },
          })
        : [{ id: card.id, status: card.status }];

      const movingIds = movingCards.map((member) => member.id);
      const fromStatuses = new Set(movingCards.map((member) => member.status));

      const destination = await tx.card.findMany({
        where: { status: toStatus, id: { notIn: movingIds } },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });

      const index = Math.min(toIndex, destination.length);
      const nextIds = [
        ...destination.slice(0, index).map((member) => member.id),
        ...movingIds,
        ...destination.slice(index).map((member) => member.id),
      ];

      await tx.card.updateMany({
        where: { id: { in: movingIds } },
        data: { status: toStatus },
      });

      // インタラクティブトランザクション内では順番に実行する
      for (const [order, id] of nextIds.entries()) {
        await tx.card.update({ where: { id }, data: { order } });
      }

      // 移動元のカラムに残ったカードの並び順を詰め直す
      for (const status of fromStatuses) {
        if (status === toStatus) continue;
        const source = await tx.card.findMany({
          where: { status },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        });
        for (const [order, member] of source.entries()) {
          await tx.card.update({ where: { id: member.id }, data: { order } });
        }
      }
    });

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** 完成したが出題には使わない問題として扱うかどうかを切り替える */
export async function setCardExcluded(input: unknown): Promise<ActionResult> {
  try {
    const { cardId, excluded } = z
      .object({ cardId: z.string().min(1), excluded: z.boolean() })
      .parse(input);

    await prisma.card.update({ where: { id: cardId }, data: { excluded } });
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/**
 * 2枚のカードを1つの大問（セット）としてまとめる。
 * 相手がすでにセットに属していればそこへ合流し、どちらも単独なら新しいセットを作る。
 */
export async function linkCards(input: unknown): Promise<ActionResult> {
  try {
    const { cardId, targetCardId } = z
      .object({ cardId: z.string().min(1), targetCardId: z.string().min(1) })
      .parse(input);

    if (cardId === targetCardId) {
      return { ok: false, error: "同じカード同士はセットにできません" };
    }

    await prisma.$transaction(async (tx) => {
      const [card, target] = await Promise.all([
        tx.card.findUnique({ where: { id: cardId }, select: { groupId: true } }),
        tx.card.findUnique({
          where: { id: targetCardId },
          select: { groupId: true },
        }),
      ]);
      if (!card || !target) throw new Error("カードが見つかりません");

      const groupId =
        target.groupId ??
        card.groupId ??
        (await tx.cardGroup.create({ data: {} })).id;

      const members = await tx.card.findMany({
        where: { groupId },
        orderBy: { groupOrder: "asc" },
        select: { id: true },
      });
      const ids = [...members.map((m) => m.id)];
      for (const id of [cardId, targetCardId]) {
        if (!ids.includes(id)) ids.push(id);
      }

      for (const [groupOrder, id] of ids.entries()) {
        await tx.card.update({ where: { id }, data: { groupId, groupOrder } });
      }
    });

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** カードをセットから外す。残りが1枚だけになったらセット自体を解散する */
export async function unlinkCard(cardId: string): Promise<ActionResult> {
  try {
    const id = z.string().min(1).parse(cardId);

    await prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({
        where: { id },
        select: { groupId: true },
      });
      if (!card?.groupId) return;

      const groupId = card.groupId;
      await tx.card.update({
        where: { id },
        data: { groupId: null, groupOrder: 0 },
      });

      const rest = await tx.card.findMany({
        where: { groupId },
        orderBy: { groupOrder: "asc" },
        select: { id: true },
      });

      if (rest.length <= 1) {
        await tx.card.updateMany({
          where: { groupId },
          data: { groupId: null, groupOrder: 0 },
        });
        await tx.cardGroup.delete({ where: { id: groupId } });
        return;
      }

      for (const [groupOrder, member] of rest.entries()) {
        await tx.card.update({
          where: { id: member.id },
          data: { groupOrder },
        });
      }
    });

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** 年度末の整理用に「完成」カラムのカードをまとめて削除する */
export async function deleteCompletedCards(): Promise<
  ActionResult & { deleted?: number }
> {
  try {
    const result = await prisma.card.deleteMany({
      where: { status: CardStatus.COMPLETED },
    });

    // 所属カードが無くなったセットを掃除する
    await prisma.cardGroup.deleteMany({ where: { cards: { none: {} } } });

    revalidatePath("/");
    return { ok: true, deleted: result.count };
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
