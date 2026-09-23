"use client";

import { Draggable } from "@hello-pangea/dnd";
import { CheckCircle2, CircleDashed, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  completionRatio,
  isQuestionComplete,
  type BoardCard,
} from "@/lib/board";

type CardItemProps = {
  card: BoardCard;
  index: number;
  onOpen: (cardId: string) => void;
};

export function CardItem({ card, index, onOpen }: CardItemProps) {
  const complete = isQuestionComplete(card);
  const ratio = completionRatio(card);

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(card.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen(card.id);
            }
          }}
          role="button"
          tabIndex={0}
          className={cn(
            "group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm outline-none transition",
            "hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
            snapshot.isDragging && "rotate-[0.6deg] border-primary/60 shadow-lg",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-3 text-sm font-medium leading-snug">
              {card.title}
            </p>
            {complete ? (
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-emerald-500"
                aria-label="4択の項目が揃っています"
              />
            ) : (
              <CircleDashed
                className="mt-0.5 size-4 shrink-0 text-muted-foreground/60"
                aria-label="未入力の項目があります"
              />
            )}
          </div>

          {card.questionText && (
            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
              {card.questionText}
            </p>
          )}

          {card.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {card.tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="outline">
                  {tag.name}
                </Badge>
              ))}
              {card.tags.length > 3 && (
                <Badge variant="outline">+{card.tags.length - 3}</Badge>
              )}
            </div>
          )}

          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                complete ? "bg-emerald-500" : "bg-primary/60",
              )}
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {card.commentCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="size-3.5" />
                  {card.commentCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {card.assignedTo ? (
                <UserAvatar
                  name={card.assignedTo.name}
                  className="size-6"
                  title={`担当: ${card.assignedTo.name}`}
                />
              ) : (
                <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                  担当者未定
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
