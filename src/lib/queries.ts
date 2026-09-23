import "server-only";

import { prisma } from "@/lib/prisma";
import type { BoardCard, BoardTag, BoardUser } from "@/lib/board";

const cardInclude = {
  author: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  tags: { select: { id: true, name: true, category: true } },
  comments: {
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

type CardWithRelations = Awaited<
  ReturnType<
    typeof prisma.card.findMany<{ include: typeof cardInclude }>
  >
>[number];

export function serializeCard(card: CardWithRelations): BoardCard {
  return {
    id: card.id,
    title: card.title,
    status: card.status,
    order: card.order,
    questionText: card.questionText,
    option1: card.option1,
    option2: card.option2,
    option3: card.option3,
    option4: card.option4,
    correctOptionIndex: card.correctOptionIndex,
    explanation: card.explanation,
    author: card.author,
    assignedTo: card.assignedTo,
    tags: card.tags,
    comments: card.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
    })),
    commentCount: card.comments.length,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

export async function getCards(): Promise<BoardCard[]> {
  const cards = await prisma.card.findMany({
    include: cardInclude,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return cards.map(serializeCard);
}

export async function getUsers(): Promise<BoardUser[]> {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getTags(): Promise<BoardTag[]> {
  return prisma.tag.findMany({
    select: { id: true, name: true, category: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}
