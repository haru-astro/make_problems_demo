"use client";

import * as React from "react";
import { Loader2, UserPlus, Users } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { BoardUser } from "@/lib/board";
import { createUser, switchUser } from "@/app/actions/users";

type MemberMenuProps = {
  users: BoardUser[];
  currentUser: BoardUser | null;
};

/** 操作中のユーザー切り替えとメンバー追加（認証は未実装） */
export function MemberMenu({ users, currentUser }: MemberMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleSwitch(userId: string) {
    setError(null);
    startTransition(async () => {
      const result = await switchUser(userId);
      if (!result.ok) setError(result.error);
      else setOpen(false);
    });
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createUser({ name, email });
      if (!result.ok) setError(result.error);
      else {
        setName("");
        setEmail("");
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        {currentUser ? (
          <>
            <UserAvatar name={currentUser.name} className="size-5" />
            <span className="max-w-28 truncate">{currentUser.name}</span>
          </>
        ) : (
          <>
            <Users />
            メンバー
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メンバー</DialogTitle>
            <DialogDescription>
              操作中のユーザーを切り替えます。コメントやカードの作成者はここで選んだ人になります。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1">
            {users.map((user) => {
              const active = currentUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSwitch(user.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition",
                    active ? "bg-primary/10" : "hover:bg-accent",
                  )}
                >
                  <UserAvatar name={user.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  {active && (
                    <span className="text-[11px] font-medium text-primary">
                      操作中
                    </span>
                  )}
                </button>
              );
            })}
            {users.length === 0 && (
              <p className="text-xs text-muted-foreground">
                メンバーがいません。下のフォームから追加してください。
              </p>
            )}
          </div>

          <Separator />

          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="member-name">名前</Label>
                <Input
                  id="member-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="山田 太郎"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="member-email">メールアドレス</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="taro@example.com"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={isPending || !name.trim() || !email.trim()}
            >
              {isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
              メンバーを追加
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
