"use server";

import { revalidatePath } from "next/cache";
import { CardStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { deleteImages } from "@/lib/image-storage";
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
  /** 編集を始めた時点の更新時刻。これが変わっていたら上書きしない */
  expectedUpdatedAt: z.string().min(1),
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

    // 開いたときから更新時刻が変わっていない場合だけ書き込む。
    // 条件付きの更新なので、同時に保存しても片方しか通らない。
    const updated = await prisma.card.updateMany({
      where: { id: data.id, updatedAt: new Date(data.expectedUpdatedAt) },
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
      },
    });

    if (updated.count === 0) {
      const exists = await prisma.card.findUnique({
        where: { id: data.id },
        select: { id: true },
      });
      // 最新の内容を画面へ流し込めるよう、ここでも再取得させる
      revalidatePath("/");
      return {
        ok: false,
        error: exists
          ? "他の人がこのカードを更新しました。最新の内容を読み込んでください"
          : "カードが見つかりません",
      };
    }

    // タグは updateMany では扱えないため、更新が通った側だけが書き換える
    await prisma.card.update({
      where: { id: data.id },
      data: { tags: { set: tags.map((tag) => ({ id: tag.id })) } },
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

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { id: true, status: true, groupId: true },
    });
    if (!card) return { ok: false, error: "カードが見つかりません" };

    // セット（大問）に属するカードは常に一緒に移動する
    const movingCards = card.groupId
      ? await prisma.card.findMany({
          where: { groupId: card.groupId },
          orderBy: [{ groupOrder: "asc" }, { order: "asc" }],
          select: { id: true, status: true },
        })
      : [{ id: card.id, status: card.status }];

    const movingIds = movingCards.map((member) => member.id);
    const fromStatuses = new Set(movingCards.map((member) => member.status));

    const destination = await prisma.card.findMany({
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

    // 移動元のカラムに残るカードも、あとで並び順を詰め直す
    const sourceIds = new Map<string, string[]>();
    for (const status of fromStatuses) {
      if (status === toStatus) continue;
      const source = await prisma.card.findMany({
        where: { status, id: { notIn: movingIds } },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      sourceIds.set(
        status,
        source.map((member) => member.id),
      );
    }

    await prisma.$transaction([
      prisma.card.updateMany({
        where: { id: { in: movingIds } },
        data: { status: toStatus },
      }),
      ...nextIds.map((id, order) =>
        prisma.card.update({ where: { id }, data: { order } }),
      ),
      ...[...sourceIds.values()].flatMap((ids) =>
        ids.map((id, order) =>
          prisma.card.update({ where: { id }, data: { order } }),
        ),
      ),
    ]);

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

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

    const [card, target] = await Promise.all([
      prisma.card.findUnique({
        where: { id: cardId },
        select: { groupId: true, status: true, order: true },
      }),
      prisma.card.findUnique({
        where: { id: targetCardId },
        select: { groupId: true, status: true },
      }),
    ]);
    if (!card || !target) return { ok: false, error: "カードが見つかりません" };

    const existingGroupId = target.groupId ?? card.groupId;
    const groupId = existingGroupId ?? crypto.randomUUID();

    const existing = existingGroupId
      ? await prisma.card.findMany({
          where: { groupId: existingGroupId },
          orderBy: [{ groupOrder: "asc" }, { order: "asc" }],
          select: { id: true, status: true },
        })
      : [];

    const memberIds = existing.map((member) => member.id);
    for (const id of [cardId, targetCardId]) {
      if (!memberIds.includes(id)) memberIds.push(id);
    }

    const previousStatuses = new Set([
      ...existing.map((member) => member.status),
      target.status,
    ]);

    // 操作したカードのカラムへ全員を集め、上下に並べる
    const others = await prisma.card.findMany({
      where: { status: card.status, id: { notIn: memberIds } },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    const insertAt = Math.min(Math.max(card.order, 0), others.length);
    const nextIds = [
      ...others.slice(0, insertAt).map((member) => member.id),
      ...memberIds,
      ...others.slice(insertAt).map((member) => member.id),
    ];

    // 別カラムから集めた場合は、元のカラムの並び順を詰め直す
    const sourceIds = new Map<string, string[]>();
    for (const status of previousStatuses) {
      if (status === card.status) continue;
      const source = await prisma.card.findMany({
        where: { status, id: { notIn: memberIds } },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      sourceIds.set(
        status,
        source.map((member) => member.id),
      );
    }

    const operations: Prisma.PrismaPromise<unknown>[] = [
      ...(existingGroupId
        ? []
        : [prisma.cardGroup.create({ data: { id: groupId } })]),
      ...memberIds.map((id, groupOrder) =>
        prisma.card.update({
          where: { id },
          data: { groupId, groupOrder, status: card.status },
        }),
      ),
      ...nextIds.map((id, order) =>
        prisma.card.update({ where: { id }, data: { order } }),
      ),
      ...[...sourceIds.values()].flatMap((ids) =>
        ids.map((id, order) =>
          prisma.card.update({ where: { id }, data: { order } }),
        ),
      ),
    ];

    await prisma.$transaction(operations);

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** セットの中での上下の並びを入れ替える */
export async function moveCardInGroup(input: unknown): Promise<ActionResult> {
  try {
    const { cardId, direction } = z
      .object({
        cardId: z.string().min(1),
        direction: z.enum(["up", "down"]),
      })
      .parse(input);

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { groupId: true },
    });
    if (!card?.groupId) return { ok: false, error: "セットに属していません" };

    const members = await prisma.card.findMany({
      where: { groupId: card.groupId },
      orderBy: [{ groupOrder: "asc" }, { order: "asc" }],
      select: { id: true, order: true },
    });

    const index = members.findIndex((member) => member.id === cardId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= members.length) {
      return { ok: true };
    }

    // カラム内の位置（order）はそのままに、中身だけ入れ替える
    const orders = members.map((member) => member.order);
    const reordered = [...members];
    [reordered[index], reordered[swapWith]] = [
      reordered[swapWith],
      reordered[index],
    ];

    await prisma.$transaction(
      reordered.map((member, position) =>
        prisma.card.update({
          where: { id: member.id },
          data: { groupOrder: position, order: orders[position] },
        }),
      ),
    );

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

    const card = await prisma.card.findUnique({
      where: { id },
      select: { groupId: true },
    });
    if (!card?.groupId) return { ok: true };

    const groupId = card.groupId;
    const rest = await prisma.card.findMany({
      where: { groupId, id: { not: id } },
      orderBy: [{ groupOrder: "asc" }, { order: "asc" }],
      select: { id: true },
    });

    // 残りが1枚だけになるならセット自体を解散する
    const dissolve = rest.length <= 1;

    // 種類の違う操作が混ざるため、型を明示してまとめて流す
    const operations: Prisma.PrismaPromise<unknown>[] = [
      prisma.card.update({
        where: { id },
        data: { groupId: null, groupOrder: 0 },
      }),
    ];

    if (dissolve) {
      operations.push(
        prisma.card.updateMany({
          where: { groupId },
          data: { groupId: null, groupOrder: 0 },
        }),
        prisma.cardGroup.delete({ where: { id: groupId } }),
      );
    } else {
      operations.push(
        ...rest.map((member, groupOrder) =>
          prisma.card.update({
            where: { id: member.id },
            data: { groupOrder },
          }),
        ),
      );
    }

    await prisma.$transaction(operations);

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/**
 * 年度末の整理用に、実際に出題した問題をまとめて削除する。
 * 「使用しない」にした問題は来年度に回せるよう残す。
 */
export async function deleteUsedCards(): Promise<
  ActionResult & { deleted?: number }
> {
  try {
    // 消えるカードの図版キーを先に控えておく
    const images = await prisma.cardImage.findMany({
      where: { card: { status: CardStatus.COMPLETED, excluded: false } },
      select: { storageKey: true },
    });

    const [result] = await prisma.$transaction([
      prisma.card.deleteMany({
        where: { status: CardStatus.COMPLETED, excluded: false },
      }),
      // 所属カードが無くなったセットを掃除する
      prisma.cardGroup.deleteMany({ where: { cards: { none: {} } } }),
    ]);

    await deleteImages(images.map((image) => image.storageKey));

    revalidatePath("/");
    return { ok: true, deleted: result.count };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteCard(cardId: string): Promise<ActionResult> {
  try {
    const id = z.string().min(1).parse(cardId);

    const images = await prisma.cardImage.findMany({
      where: { cardId: id },
      select: { storageKey: true },
    });

    await prisma.card.delete({ where: { id } });
    await deleteImages(images.map((image) => image.storageKey));

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
