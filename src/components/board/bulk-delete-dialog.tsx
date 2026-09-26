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
import { deleteUsedCards } from "@/app/actions/cards";

type BulkDeleteDialogProps = {
  /** 完成かつ出題に使う問題の件数 */
  usedCount: number;
  /** 完成だが「使用しない」にしている件数 */
  excludedCount: number;
  onExportCsv: () => void;
};

/** 年度末に、出題し終えた問題をまとめて片付けるための一括削除 */
export function BulkDeleteDialog({
  usedCount,
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
        disabled={usedCount === 0}
        title="出題に使った問題をまとめて削除します"
      >
        <Trash2 />
        使用した問題を一括削除
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>使用した問題をまとめて削除</DialogTitle>
            <DialogDescription>
              年度末の整理用です。アイデア・問題作成中・レビュー中のカードは残ります。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <p className="flex items-start gap-2 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                <span>
                  完成のうち出題に使う <strong>{usedCount} 問</strong>
                  を削除します。図版とコメントも一緒に消え、
                  <strong>元に戻せません</strong>。
                  {excludedCount > 0 && (
                    <>
                      <br />
                      「使用しない」にしている {excludedCount}{" "}
                      問は、来年度に回せるよう残します。
                    </>
                  )}
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
                  const result = await deleteUsedCards();
                  if (!result.ok) setError(result.error);
                  else setOpen(false);
                })
              }
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {usedCount} 問を削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
