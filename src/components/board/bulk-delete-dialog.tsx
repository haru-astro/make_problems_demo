"use client";

import * as React from "react";
import { Download, Loader2, Trash2, TriangleAlert } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteCompletedCards } from "@/app/actions/cards";

type BulkDeleteDialogProps = {
  completedCount: number;
  excludedCount: number;
  onExportCsv: () => void;
};

/** 年度末に「完成」カラムを空にするための一括削除 */
export function BulkDeleteDialog({
  completedCount,
  excludedCount,
  onExportCsv,
}: BulkDeleteDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [exported, setExported] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // ダイアログを開くたびに初期状態へ戻す（レンダー中の状態調整）
  const [syncedOpen, setSyncedOpen] = React.useState(open);
  if (syncedOpen !== open) {
    setSyncedOpen(open);
    if (open) {
      setExported(false);
      setError(null);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={completedCount === 0}
        title="完成した問題をまとめて削除します"
      >
        <Trash2 />
        完成を一括削除
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>完成した問題をまとめて削除</DialogTitle>
            <DialogDescription>
              年度末の整理用です。アイデア・問題作成中・レビュー中のカードは残ります。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <p className="flex items-start gap-2 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                <span>
                  「完成」カラムの <strong>{completedCount} 問</strong>
                  {excludedCount > 0 && `（うち使用しない ${excludedCount} 問）`}
                  を削除します。図版とコメントも一緒に消え、
                  <strong>元に戻せません</strong>。
                </span>
              </p>
            </div>

            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">
                削除する前に CSV で控えを残しておくことをおすすめします。
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => {
                  onExportCsv();
                  setExported(true);
                }}
              >
                <Download />
                {exported ? "CSVを保存しました" : "先にCSVを書き出す"}
              </Button>
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteCompletedCards();
                  if (!result.ok) setError(result.error);
                  else setOpen(false);
                })
              }
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {completedCount} 問を削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
