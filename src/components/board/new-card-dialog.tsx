"use client";

import * as React from "react";
import { CardStatus } from "@prisma/client";
import { Loader2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/board/tag-input";
import { STATUS_META, STATUS_ORDER, type BoardTag, type BoardUser } from "@/lib/board";
import { createCard } from "@/app/actions/cards";

const UNASSIGNED = "__unassigned__";

type NewCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus: CardStatus;
  users: BoardUser[];
  tags: BoardTag[];
};

export function NewCardDialog({
  open,
  onOpenChange,
  defaultStatus,
  users,
  tags,
}: NewCardDialogProps) {
  const [title, setTitle] = React.useState("");
  const [status, setStatus] = React.useState<CardStatus>(defaultStatus);
  const [assignedToId, setAssignedToId] = React.useState(UNASSIGNED);
  const [tagNames, setTagNames] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // ダイアログを開くたびに初期状態へ戻す（レンダー中の状態調整）
  const [syncedKey, setSyncedKey] = React.useState<string | null>(null);
  const openKey = open ? defaultStatus : null;
  if (syncedKey !== openKey) {
    setSyncedKey(openKey);
    if (open) {
      setStatus(defaultStatus);
      setTitle("");
      setAssignedToId(UNASSIGNED);
      setTagNames([]);
      setError(null);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCard({
        title,
        status,
        assignedToId: assignedToId === UNASSIGNED ? null : assignedToId,
        tagNames,
      });
      if (!result.ok) setError(result.error);
      else onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>カードを追加</DialogTitle>
          <DialogDescription>
            まずはタイトルだけでOKです。問題文や選択肢は後からカードを開いて入力できます。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-card-title">タイトル・概要</Label>
            <Input
              id="new-card-title"
              autoFocus
              placeholder="例) 消化器系ホルモンの働きを問う"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>ステータス</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as CardStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((value) => (
                    <SelectItem key={value} value={value}>
                      {STATUS_META[value].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>担当者</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
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
          </div>

          <div className="space-y-1.5">
            <Label>タグ</Label>
            <TagInput
              value={tagNames}
              onChange={setTagNames}
              suggestions={tags}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending && <Loader2 className="animate-spin" />}追加する
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
