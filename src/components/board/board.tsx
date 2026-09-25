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
            `${card.id}:${card.status}:${card.order}:${card.updatedAt}:${card.commentCount}:${card.images
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

  /** フィルタ表示中でも正しい位置に挿入できるよう、実データ上の index を求める */
  function resolveInsertIndex(
    destStatus: CardStatus,
    destinationIndex: number,
    draggedId: string,
  ) {
    const fullIds = grouped[destStatus]
      .filter((card) => card.id !== draggedId)
      .map((card) => card.id);
    const visibleIds = filtered[destStatus]
      .filter((card) => card.id !== draggedId)
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

      const fromStatus = target.status;
      const destination = prev
        .filter((card) => card.status === toStatus && card.id !== cardId)
        .sort((a, b) => a.order - b.order);

      const index = Math.min(toIndex, destination.length);
      const nextDestination = [
        ...destination.slice(0, index),
        { ...target, status: toStatus },
        ...destination.slice(index),
      ];

      const orderById = new Map<string, number>();
      nextDestination.forEach((card, order) => orderById.set(card.id, order));

      if (fromStatus !== toStatus) {
        prev
          .filter((card) => card.status === fromStatus && card.id !== cardId)
          .sort((a, b) => a.order - b.order)
          .forEach((card, order) => orderById.set(card.id, order));
      }

      return prev.map((card) => {
        if (card.id === cardId) {
          return { ...card, status: toStatus, order: orderById.get(cardId) ?? 0 };
        }
        const order = orderById.get(card.id);
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
    const toIndex = resolveInsertIndex(toStatus, destination.index, draggableId);
    applyMove(draggableId, toStatus, toIndex);
  }

  function handleStatusChange(cardId: string, status: CardStatus) {
    const toIndex = grouped[status].filter((card) => card.id !== cardId).length;
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
