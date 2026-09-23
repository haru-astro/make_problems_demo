"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BoardTag } from "@/lib/board";

type TagInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: BoardTag[];
  placeholder?: string;
  className?: string;
};

/** タグ名の配列を編集する入力欄（Enter / カンマで確定、既存タグをサジェスト） */
export function TagInput({
  value,
  onChange,
  suggestions,
  placeholder = "タグを入力して Enter",
  className,
}: TagInputProps) {
  const [draft, setDraft] = React.useState("");

  const remaining = React.useMemo(() => {
    const used = new Set(value.map((v) => v.toLowerCase()));
    const keyword = draft.trim().toLowerCase();
    return suggestions
      .filter((tag) => !used.has(tag.name.toLowerCase()))
      .filter((tag) => (keyword ? tag.name.toLowerCase().includes(keyword) : true))
      .slice(0, 8);
  }, [suggestions, value, draft]);

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, trimmed]);
    setDraft("");
  }

  function removeTag(name: string) {
    onChange(value.filter((v) => v !== name));
  }

  return (
    <div className={cn("space-y-2", className)}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="pr-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full p-0.5 text-muted-foreground transition hover:bg-background hover:text-foreground"
                aria-label={`タグ ${tag} を削除`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        // 入力途中のタグを取りこぼさないよう、フォーカスが外れた時点で確定する
        onBlur={() => addTag(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addTag(draft);
          } else if (event.key === "Backspace" && !draft && value.length > 0) {
            removeTag(value[value.length - 1]);
          }
        }}
      />

      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {remaining.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => addTag(tag.name)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <Plus className="size-3" />
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
