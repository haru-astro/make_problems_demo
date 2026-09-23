"use client";

import * as React from "react";
import { CardStatus } from "@prisma/client";
import { Loader2, Send, Trash2, TriangleAlert } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/board/tag-input";
import { cn, formatDateTime } from "@/lib/utils";
import {
  OPTION_LABELS,
  STATUS_META,
  STATUS_ORDER,
  type BoardCard,
  type BoardTag,
  type BoardUser,
} from "@/lib/board";
import { deleteCard, updateCard } from "@/app/actions/cards";
import { addComment, deleteComment } from "@/app/actions/comments";

const UNASSIGNED = "__unassigned__";

type CardDialogProps = {
  card: BoardCard | null;
  users: BoardUser[];
  tags: BoardTag[];
  currentUser: BoardUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (cardId: string, status: CardStatus) => void;
};

type FormState = {
  title: string;
  questionText: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctOptionIndex: number | null;
  explanation: string;
  assignedToId: string;
  tagNames: string[];
};

function toFormState(card: BoardCard): FormState {
  return {
    title: card.title,
    questionText: card.questionText ?? "",
    option1: card.option1 ?? "",
    option2: card.option2 ?? "",
    option3: card.option3 ?? "",
    option4: card.option4 ?? "",
    correctOptionIndex: card.correctOptionIndex,
    explanation: card.explanation ?? "",
    assignedToId: card.assignedTo?.id ?? UNASSIGNED,
    tagNames: card.tags.map((tag) => tag.name),
  };
}

export function CardDialog({
  card,
  users,
  tags,
  currentUser,
  open,
  onOpenChange,
  onStatusChange,
}: CardDialogProps) {
  const [form, setForm] = React.useState<FormState | null>(
    card ? toFormState(card) : null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [comment, setComment] = React.useState("");
  const [isSaving, startSaving] = React.useTransition();
  const [isCommenting, startCommenting] = React.useTransition();
  const [isDeleting, startDeleting] = React.useTransition();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const cardId = card?.id ?? null;

  // 別のカードを開いたときはフォームを差し替える（レンダー中の状態調整）
  const [syncedCardId, setSyncedCardId] = React.useState(cardId);
  if (syncedCardId !== cardId) {
    setSyncedCardId(cardId);
    setForm(card ? toFormState(card) : null);
    setError(null);
    setComment("");
    setConfirmDelete(false);
  }

  if (!card || !form) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handleSave() {
    if (!card || !form) return;
    setError(null);
    startSaving(async () => {
      const result = await updateCard({
        id: card.id,
        title: form.title,
        questionText: form.questionText,
        option1: form.option1,
        option2: form.option2,
        option3: form.option3,
        option4: form.option4,
        correctOptionIndex: form.correctOptionIndex,
        explanation: form.explanation,
        assignedToId:
          form.assignedToId === UNASSIGNED ? null : form.assignedToId,
        tagNames: form.tagNames,
      });
      if (!result.ok) setError(result.error);
      else onOpenChange(false);
    });
  }

  function handleAddComment() {
    if (!card || !comment.trim()) return;
    setError(null);
    startCommenting(async () => {
      const result = await addComment({ cardId: card.id, content: comment });
      if (!result.ok) setError(result.error);
      else setComment("");
    });
  }

  function handleDelete() {
    if (!card) return;
    startDeleting(async () => {
      const result = await deleteCard(card.id);
      if (!result.ok) setError(result.error);
      else onOpenChange(false);
    });
  }

  const optionValues = [
    form.option1,
    form.option2,
    form.option3,
    form.option4,
  ] as const;
  const optionKeys = ["option1", "option2", "option3", "option4"] as const;

  const missing: string[] = [];
  if (!form.questionText.trim()) missing.push("問題文");
  const emptyOptions = optionValues.filter((value) => !value.trim()).length;
  if (emptyOptions > 0) missing.push(`選択肢（未入力 ${emptyOptions} 件）`);
  if (!form.correctOptionIndex) missing.push("正解");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl"
        // 編集中に枠外をクリックしても閉じない（入力内容を失わないため）
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>カードの編集</DialogTitle>
          <DialogDescription>
            作成者 {card.author.name} ・ 更新 {formatDateTime(card.updatedAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="thin-scrollbar -mx-1 flex-1 overflow-y-auto px-1">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {/* 左: 問題本体 */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="card-title">タイトル・概要</Label>
                <Input
                  id="card-title"
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="card-question">問題文</Label>
                <Textarea
                  id="card-question"
                  rows={4}
                  placeholder="例) 次のうち、〇〇に関する説明として正しいものはどれか。"
                  value={form.questionText}
                  onChange={(event) =>
                    update("questionText", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>選択肢（ラジオボタンで正解を指定）</Label>
                  {form.correctOptionIndex && (
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                      onClick={() => update("correctOptionIndex", null)}
                    >
                      正解の指定を解除
                    </button>
                  )}
                </div>

                {OPTION_LABELS.map((label, index) => {
                  const key = optionKeys[index];
                  const isCorrect = form.correctOptionIndex === index + 1;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2 transition-colors",
                        isCorrect
                          ? "border-emerald-500/60 bg-emerald-500/5"
                          : "border-border",
                      )}
                    >
                      <label className="flex shrink-0 cursor-pointer items-center gap-2 pl-1">
                        <input
                          type="radio"
                          name="correct-option"
                          className="size-4 accent-emerald-600"
                          checked={isCorrect}
                          onChange={() =>
                            update("correctOptionIndex", index + 1)
                          }
                          aria-label={`選択肢 ${label} を正解にする`}
                        />
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            isCorrect
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-muted-foreground",
                          )}
                        >
                          {label}
                        </span>
                      </label>
                      <Input
                        value={optionValues[index]}
                        placeholder={`選択肢 ${label}`}
                        onChange={(event) => update(key, event.target.value)}
                        className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="card-explanation">解説・出典</Label>
                <Textarea
                  id="card-explanation"
                  rows={3}
                  placeholder="正解の理由、参考文献やページ番号など"
                  value={form.explanation}
                  onChange={(event) => update("explanation", event.target.value)}
                />
              </div>

              {missing.length > 0 && (
                <p className="flex items-start gap-1.5 rounded-md bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
                  <TriangleAlert className="mt-px size-3.5 shrink-0" />
                  未入力: {missing.join(" / ")}
                </p>
              )}
            </div>

            {/* 右: メタ情報とコメント */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>ステータス</Label>
                <Select
                  value={card.status}
                  onValueChange={(value) =>
                    onStatusChange(card.id, value as CardStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_META[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>担当者</Label>
                <Select
                  value={form.assignedToId}
                  onValueChange={(value) => update("assignedToId", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>担当者未定</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>タグ（分野・難易度など）</Label>
                <TagInput
                  value={form.tagNames}
                  onChange={(next) => update("tagNames", next)}
                  suggestions={tags}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>コメント（{card.comments.length}）</Label>
                <div className="thin-scrollbar max-h-56 space-y-3 overflow-y-auto pr-1">
                  {card.comments.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      レビューのコメントはまだありません。
                    </p>
                  )}
                  {card.comments.map((item) => (
                    <div key={item.id} className="flex gap-2">
                      <UserAvatar name={item.user.name} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-medium">
                            {item.user.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDateTime(item.createdAt)}
                          </span>
                          {currentUser?.id === item.user.id && (
                            <button
                              type="button"
                              className="ml-auto text-[10px] text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                startCommenting(async () => {
                                  const result = await deleteComment(item.id);
                                  if (!result.ok) setError(result.error);
                                })
                              }
                            >
                              削除
                            </button>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                          {item.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-end gap-2">
                  <Textarea
                    rows={2}
                    className="min-h-0 text-xs"
                    placeholder={
                      currentUser
                        ? `${currentUser.name} としてコメント…`
                        : "コメント…"
                    }
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        (event.metaKey || event.ctrlKey)
                      ) {
                        event.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    disabled={isCommenting || !comment.trim()}
                    onClick={handleAddComment}
                    aria-label="コメントを追加"
                  >
                    {isCommenting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Send />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <DialogFooter className="sm:justify-between">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                このカードを削除しますか？
              </span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                {isDeleting && <Loader2 className="animate-spin" />}削除する
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                やめる
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 />
              削除
            </Button>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              閉じる
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin" />}保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
