"use client";

import { Droppable } from "@hello-pangea/dnd";
import type { CardStatus } from "@prisma/client";

import { CardItem } from "@/components/board/card-item";
import { cn } from "@/lib/utils";
import { STATUS_META, type BoardCard, type QuestionNumber } from "@/lib/board";

type BoardColumnProps = {
  status: CardStatus;
  cards: BoardCard[];
  onOpenCard: (cardId: string) => void;
  onAddCard: (status: CardStatus) => void;
  /** カードIDごとの問題番号 */
  questionNumbers: Map<string, QuestionNumber>;
};

export function BoardColumn({
  status,
  cards,
  onOpenCard,
  onAddCard,
  questionNumbers,
}: BoardColumnProps) {
  const meta = STATUS_META[status];

  return (
    <section className="flex w-[300px] shrink-0 flex-col rounded-xl bg-muted/50 p-2 sm:w-[320px]">
      <header className="sticky top-0 z-10 rounded-t-xl bg-muted px-2 pb-2 pt-1">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", meta.dot)} />
          <h2 className={cn("text-sm font-semibold", meta.header)}>
            {meta.label}
          </h2>
          <span className="rounded-full bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {cards.length}
          </span>
        </div>
        <p className="mt-0.5 pl-4 text-[11px] text-muted-foreground">
          {meta.description}
        </p>
      </header>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex min-h-24 flex-col gap-2 rounded-lg p-1 transition-colors",
              snapshot.isDraggingOver && "bg-primary/5 ring-1 ring-primary/30",
            )}
          >
            {cards.map((card, index) => (
              <CardItem
                key={card.id}
                card={card}
                index={index}
                onOpen={onOpenCard}
                questionNumber={questionNumbers.get(card.id) ?? null}
              />
            ))}
            {provided.placeholder}

            {cards.length === 0 && !snapshot.isDraggingOver && (
              <button
                type="button"
                onClick={() => onAddCard(status)}
                className="mt-1 rounded-lg border border-dashed border-border px-3 py-6 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary"
              >
                カードがありません。クリックして追加
              </button>
            )}
          </div>
        )}
      </Droppable>
    </section>
  );
}
