"use client";

import { Plus, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberMenu } from "@/components/board/member-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { BoardTag, BoardUser } from "@/lib/board";

export const ALL = "__all__";
export const UNASSIGNED_FILTER = "__unassigned__";

export type Filters = {
  query: string;
  assigneeId: string;
  tagIds: string[];
  incompleteOnly: boolean;
};

export const EMPTY_FILTERS: Filters = {
  query: "",
  assigneeId: ALL,
  tagIds: [],
  incompleteOnly: false,
};

type BoardToolbarProps = {
  users: BoardUser[];
  tags: BoardTag[];
  currentUser: BoardUser | null;
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  onAddCard: () => void;
  visibleCount: number;
  totalCount: number;
  completedCount: number;
};

export function BoardToolbar({
  users,
  tags,
  currentUser,
  filters,
  onFiltersChange,
  onAddCard,
  visibleCount,
  totalCount,
  completedCount,
}: BoardToolbarProps) {
  const hasFilters =
    filters.query.trim() !== "" ||
    filters.assigneeId !== ALL ||
    filters.tagIds.length > 0 ||
    filters.incompleteOnly;

  function toggleTag(tagId: string) {
    onFiltersChange({
      ...filters,
      tagIds: filters.tagIds.includes(tagId)
        ? filters.tagIds.filter((id) => id !== tagId)
        : [...filters.tagIds, tagId],
    });
  }

  return (
    <div className="space-y-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-tight">作問ボード</h1>
          <p className="text-xs text-muted-foreground">
            全 {totalCount} 問 ・ 完成 {completedCount} 問
            {hasFilters && ` ・ 表示中 ${visibleCount} 問`}
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(event) =>
              onFiltersChange({ ...filters, query: event.target.value })
            }
            placeholder="タイトル・問題文を検索"
            className="h-8 w-52 pl-8 text-xs"
          />
        </div>

        <Select
          value={filters.assigneeId}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, assigneeId: value })
          }
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="担当者" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>担当者: すべて</SelectItem>
            <SelectItem value={UNASSIGNED_FILTER}>担当者未定</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={filters.incompleteOnly ? "default" : "outline"}
          size="sm"
          onClick={() =>
            onFiltersChange({
              ...filters,
              incompleteOnly: !filters.incompleteOnly,
            })
          }
        >
          未完成のみ
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange(EMPTY_FILTERS)}
          >
            <X />
            条件をクリア
          </Button>
        )}

        <ThemeToggle />

        <MemberMenu users={users} currentUser={currentUser} />

        <Button size="sm" onClick={onAddCard}>
          <Plus />
          カードを追加
        </Button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">タグ:</span>
          {tags.map((tag) => {
            const active = filters.tagIds.includes(tag.id);
            return (
              <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}>
                <Badge
                  variant={active ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition",
                    active ? "ring-1 ring-primary/40" : "hover:border-primary/50",
                  )}
                >
                  {tag.name}
                </Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
