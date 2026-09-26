"use client";

import { Draggable } from "@hello-pangea/dnd";
import {
  CheckCircle2,
  CircleDashed,
  EyeOff,
  ImageIcon,
  Layers,
  MessageSquare,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  completionRatio,
  isQuestionComplete,
  type BoardCard,
  type BoardUnit,
  type QuestionNumber,
} from "@/lib/board";

type CardUnitProps = {
  unit: BoardUnit;
  index: number;
  onOpen: (cardId: string) => void;
  questionNumbers: Map<string, QuestionNumber>;
};

/** ドラッグの単位。単独カードは1枚、セットは複数枚をまとめて1枚のように動かす */
export function CardUnit({
  unit,
  index,
  onOpen,
  questionNumbers,
}: CardUnitProps) {
  const isSet = unit.cards.length > 1;
  const number = questionNumbers.get(unit.cards[0].id) ?? null;

  return (
    <Draggable draggableId={unit.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "rounded-lg outline-none transition",
            isSet &&
              "border border-violet-400/60 bg-violet-500/5 p-1.5 dark:border-violet-400/40",
            snapshot.isDragging && "rotate-[0.6deg] shadow-lg",
          )}
        >
          {isSet && (
            <div className="flex items-center gap-1.5 px-1 pb-1.5 text-[11px] font-medium text-violet-700 dark:text-violet-300">
              <Layers className="size-3.5" />
              大問セット（{unit.cards.length}問）
              {number && <span className="ml-auto">{number.label}</span>}
            </div>
          )}

          <div className={cn(isSet && "space-y-1.5")}>
            {unit.cards.map((card, position) => (
              <CardFace
                key={card.id}
                card={card}
                onOpen={onOpen}
                questionNumber={questionNumbers.get(card.id) ?? null}
                setPosition={isSet ? position + 1 : null}
                isDragging={snapshot.isDragging}
              />
            ))}
          </div>
        </div>
      )}
    </Draggable>
  );
}

type CardFaceProps = {
  card: BoardCard;
  onOpen: (cardId: string) => void;
  questionNumber: QuestionNumber | null;
  /** セット内での位置（単独カードは null） */
  setPosition: number | null;
  isDragging: boolean;
};

function CardFace({
  card,
  onOpen,
  questionNumber,
  setPosition,
  isDragging,
}: CardFaceProps) {
  const complete = isQuestionComplete(card);
  const ratio = completionRatio(card);

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        onOpen(card.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          onOpen(card.id);
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm outline-none transition",
        "hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "border-primary/60",
        card.excluded && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-3 text-sm font-medium leading-snug">
          {setPosition !== null && (
            <span className="mr-1.5 rounded bg-violet-500/15 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-violet-700 dark:text-violet-300">
              ({setPosition})
            </span>
          )}
          {questionNumber !== null && setPosition === null && (
            <span className="mr-1.5 rounded bg-emerald-500/15 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              {questionNumber.label}
            </span>
          )}
          {card.excluded && (
            <span className="mr-1.5 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 align-middle text-[11px] font-medium text-muted-foreground">
              <EyeOff className="size-3" />
              使用しない
            </span>
          )}
          <span className={cn(card.excluded && "line-through")}>
            {card.title}
          </span>
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
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {card.commentCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3.5" />
              {card.commentCount}
            </span>
          )}
          {card.images.length > 0 && (
            <span
              className="inline-flex items-center gap-1"
              title={`図版 ${card.images.length} 枚`}
            >
              <ImageIcon className="size-3.5" />
              {card.images.length}
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
  );
}
