"use client";

import { Download, Plus, Search, TriangleAlert, X } from "lucide-react";

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
import { OPTION_LABELS } from "@/lib/board";

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
  /** 完成問題の正解番号の分布 */
  distribution: { counts: number[]; total: number; biased: boolean };
  onExportCsv: () => void;
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
  distribution,
  onExportCsv,
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
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-tight">作問ボード</h1>
          <p className="text-xs text-muted-foreground">
            全 {totalCount} 問 ・ 完成 {completedCount} 問
            {hasFilters && ` ・ 表示中 ${visibleCount} 問`}
          </p>
        </div>

        <Button onClick={onAddCard} className="shadow">
          <Plus />
          カードを追加
        </Button>

        <div className="relative ml-auto">
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

        <Button
          variant="outline"
          size="sm"
          onClick={onExportCsv}
          disabled={completedCount === 0}
          title="完成した問題を番号順に CSV で書き出します（図版は含まれません）"
        >
          <Download />
          CSV出力
        </Button>

        <ThemeToggle />

        <MemberMenu users={users} currentUser={currentUser} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {tags.length > 0 && (
          <>
            <span className="text-[11px] text-muted-foreground">タグ:</span>
            {tags.map((tag) => {
              const active = filters.tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                >
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
          </>
        )}

        <AnswerBalance distribution={distribution} />
      </div>
    </div>
  );
}

/** 完成問題の正解位置の偏りを表示する */
function AnswerBalance({
  distribution,
}: {
  distribution: { counts: number[]; total: number; biased: boolean };
}) {
  const { counts, total, biased } = distribution;

  if (total === 0) {
    return (
      <span className="ml-auto text-[11px] text-muted-foreground">
        正解の分布: 完成問題がありません
      </span>
    );
  }

  return (
    <div
      className={cn(
        "ml-auto flex items-center gap-2 rounded-md px-2 py-1",
        biased && "bg-amber-500/10",
      )}
      title={
        biased
          ? "正解の位置が特定の番号に偏っています。選択肢の並べ替えを検討してください"
          : "完成問題の正解番号の分布"
      }
    >
      <span className="text-[11px] text-muted-foreground">正解の分布:</span>
      {OPTION_LABELS.map((label, index) => {
        const count = counts[index];
        const share = count / total;
        return (
          <span
            key={label}
            className="flex items-center gap-1 text-[11px] text-muted-foreground"
          >
            {label}
            <span className="inline-block h-1.5 w-8 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  "block h-full rounded-full",
                  biased && share > 0.4 ? "bg-amber-500" : "bg-primary/60",
                )}
                style={{ width: `${Math.round(share * 100)}%` }}
              />
            </span>
            <span className="tabular-nums">{count}</span>
          </span>
        );
      })}
      {biased && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          <TriangleAlert className="size-3" />
          偏りあり
        </span>
      )}
    </div>
  );
}
