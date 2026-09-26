"use client";

import * as React from "react";
import {
  DragDropContext,
  type DropResult,
} from "@hello-pangea/dnd";
import { CardStatus } from "@prisma/client";

import { BoardColumn } from "@/components/board/board-column";
import { CardDialog } from "@/components/board/card-dialog";
import { NewCardDialog } from "@/components/board/new-card-dialog";
import {
  ALL,
  BoardToolbar,
  EMPTY_FILTERS,
  UNASSIGNED_FILTER,
  type Filters,
} from "@/components/board/board-toolbar";
import {
  STATUS_ORDER,
  answerDistribution,
  isQuestionComplete,
  questionNumbers,
  type BoardCard,
  type BoardTag,
  type BoardUser,
} from "@/lib/board";
import { moveCard } from "@/app/actions/cards";
import { exportCards } from "@/lib/csv";

type BoardProps = {
  cards: BoardCard[];
  users: BoardUser[];
  tags: BoardTag[];
  currentUser: BoardUser | null;
};

type Grouped = Record<CardStatus, BoardCard[]>;

function group(cards: BoardCard[]): Grouped {
  const result = Object.fromEntries(
    STATUS_ORDER.map((status) => [status, [] as BoardCard[]]),
  ) as Grouped;
  for (const card of cards) result[card.status].push(card);
  for (const status of STATUS_ORDER) {
    result[status].sort((a, b) => a.order - b.order);
  }
  return result;
}

export function Board({ cards: serverCards, users, tags, currentUser }: BoardProps) {
  const [cards, setCards] = React.useState(serverCards);
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const [openCardId, setOpenCardId] = React.useState<string | null>(null);
  const [newCardStatus, setNewCardStatus] = React.useState<CardStatus | null>(
    null,
  );
  const [, startTransition] = React.useTransition();

  // サーバー側のデータが更新されたらローカル状態を同期する（レンダー中の状態調整）
  const serverSignature = React.useMemo(
    () =>
      serverCards
        .map(
          (card) =>
            // 画像の増減やキャプション変更も検知する必要があるため署名に含める
            `${card.id}:${card.status}:${card.order}:${card.excluded}:${card.groupId}:${card.groupOrder}:${card.updatedAt}:${card.commentCount}:${card.images
              .map((image) => `${image.id}${image.caption ?? ""}`)
              .join(",")}`,
        )
        .join("|"),
    [serverCards],
  );
  const [syncedSignature, setSyncedSignature] = React.useState(serverSignature);
  if (syncedSignature !== serverSignature) {
    setSyncedSignature(serverSignature);
    setCards(serverCards);
  }

  const grouped = React.useMemo(() => group(cards), [cards]);

  // 番号と正解分布は「完成」カラムの内容から毎回計算する
  const numbers = React.useMemo(() => questionNumbers(cards), [cards]);
  const distribution = React.useMemo(() => answerDistribution(cards), [cards]);

  const filtered = React.useMemo(() => {
    const keyword = filters.query.trim().toLowerCase();
    const matches = (card: BoardCard) => {
      if (keyword) {
        const haystack = [
          card.title,
          card.questionText,
          card.option1,
          card.option2,
          card.option3,
          card.option4,
          card.explanation,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      if (filters.assigneeId === UNASSIGNED_FILTER && card.assignedTo) return false;
      if (
        filters.assigneeId !== ALL &&
        filters.assigneeId !== UNASSIGNED_FILTER &&
        card.assignedTo?.id !== filters.assigneeId
      ) {
        return false;
      }
      if (filters.tagIds.length > 0) {
        const cardTagIds = new Set(card.tags.map((tag) => tag.id));
        if (!filters.tagIds.every((id) => cardTagIds.has(id))) return false;
      }
      if (filters.incompleteOnly && isQuestionComplete(card)) return false;
      return true;
    };

    return Object.fromEntries(
      STATUS_ORDER.map((status) => [status, grouped[status].filter(matches)]),
    ) as Grouped;
  }, [grouped, filters]);

  const visibleCount = STATUS_ORDER.reduce(
    (sum, status) => sum + filtered[status].length,
    0,
  );
  const completedCount = cards.filter(
    (card) => card.status === CardStatus.COMPLETED,
  ).length;
  const excludedCount = cards.filter(
    (card) => card.status === CardStatus.COMPLETED && card.excluded,
  ).length;

  /** 一緒に動くカード（セットなら全メンバー、単独ならそのカードだけ） */
  function movingIdsOf(cardId: string) {
    const target = cards.find((card) => card.id === cardId);
    if (!target?.groupId) return new Set([cardId]);
    return new Set(
      cards
        .filter((card) => card.groupId === target.groupId)
        .map((card) => card.id),
    );
  }

  /** フィルタ表示中でも正しい位置に挿入できるよう、実データ上の index を求める */
  function resolveInsertIndex(
    destStatus: CardStatus,
    destinationIndex: number,
    movingIds: Set<string>,
  ) {
    const fullIds = grouped[destStatus]
      .filter((card) => !movingIds.has(card.id))
      .map((card) => card.id);
    const visibleIds = filtered[destStatus]
      .filter((card) => !movingIds.has(card.id))
      .map((card) => card.id);

    const anchorId = visibleIds[destinationIndex];
    if (!anchorId) return fullIds.length;
    const index = fullIds.indexOf(anchorId);
    return index === -1 ? fullIds.length : index;
  }

  function applyMove(cardId: string, toStatus: CardStatus, toIndex: number) {
    setCards((prev) => {
      const target = prev.find((card) => card.id === cardId);
      if (!target) return prev;

      // セットのカードは全員まとめて動かす
      const moving = target.groupId
        ? prev
            .filter((card) => card.groupId === target.groupId)
            .sort((a, b) => a.groupOrder - b.groupOrder || a.order - b.order)
        : [target];
      const movingIds = new Set(moving.map((card) => card.id));
      const fromStatuses = new Set(moving.map((card) => card.status));

      const destination = prev
        .filter((card) => card.status === toStatus && !movingIds.has(card.id))
        .sort((a, b) => a.order - b.order);

      const index = Math.min(toIndex, destination.length);
      const nextDestination = [
        ...destination.slice(0, index).map((card) => card.id),
        ...moving.map((card) => card.id),
        ...destination.slice(index).map((card) => card.id),
      ];

      const orderById = new Map<string, number>();
      nextDestination.forEach((id, order) => orderById.set(id, order));

      for (const status of fromStatuses) {
        if (status === toStatus) continue;
        prev
          .filter((card) => card.status === status && !movingIds.has(card.id))
          .sort((a, b) => a.order - b.order)
          .forEach((card, order) => orderById.set(card.id, order));
      }

      return prev.map((card) => {
        const order = orderById.get(card.id);
        if (movingIds.has(card.id)) {
          return { ...card, status: toStatus, order: order ?? card.order };
        }
        return order === undefined ? card : { ...card, order };
      });
    });

    startTransition(async () => {
      const result = await moveCard({ cardId, toStatus, toIndex });
      if (!result.ok) {
        // 失敗したらサーバーの状態に戻す
        setCards(serverCards);
      }
    });
  }

  function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const toStatus = destination.droppableId as CardStatus;
    const movingIds = movingIdsOf(draggableId);
    const toIndex = resolveInsertIndex(toStatus, destination.index, movingIds);
    applyMove(draggableId, toStatus, toIndex);
  }

  function handleStatusChange(cardId: string, status: CardStatus) {
    const movingIds = movingIdsOf(cardId);
    const toIndex = grouped[status].filter(
      (card) => !movingIds.has(card.id),
    ).length;
    applyMove(cardId, status, toIndex);
  }

  const openCard = cards.find((card) => card.id === openCardId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BoardToolbar
        users={users}
        tags={tags}
        currentUser={currentUser}
        filters={filters}
        onFiltersChange={setFilters}
        onAddCard={() => setNewCardStatus(CardStatus.IDEA)}
        visibleCount={visibleCount}
        totalCount={cards.length}
        completedCount={completedCount}
        excludedCount={excludedCount}
        distribution={distribution}
        onExportCsv={() => exportCards(cards)}
      />

      {users.length === 0 && (
        <p className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-xs text-amber-800 dark:text-amber-200">
          メンバーが登録されていません。`npm run db:seed`
          を実行するか、右上の「メンバー」から追加してください。
        </p>
      )}

      <div className="thin-scrollbar min-h-0 flex-1 overflow-auto p-4 sm:px-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex min-h-[24rem] items-start gap-4">
            {STATUS_ORDER.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                cards={filtered[status]}
                onOpenCard={setOpenCardId}
                onAddCard={(value) => setNewCardStatus(value)}
                questionNumbers={numbers}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      <CardDialog
        card={openCard}
        users={users}
        tags={tags}
        currentUser={currentUser}
        open={Boolean(openCard)}
        onOpenChange={(open) => !open && setOpenCardId(null)}
        onStatusChange={handleStatusChange}
        questionNumber={openCard ? (numbers.get(openCard.id) ?? null) : null}
        allCards={cards}
      />

      <NewCardDialog
        open={newCardStatus !== null}
        onOpenChange={(open) => !open && setNewCardStatus(null)}
        defaultStatus={newCardStatus ?? CardStatus.IDEA}
        users={users}
        tags={tags}
      />
    </div>
  );
}
