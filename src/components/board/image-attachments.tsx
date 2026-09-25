"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatBytes, prepareImage } from "@/lib/image";
import type { BoardImage } from "@/lib/board";
import {
  addCardImage,
  deleteCardImage,
  updateImageCaption,
} from "@/app/actions/images";

type ImageAttachmentsProps = {
  cardId: string;
  images: BoardImage[];
  onError: (message: string | null) => void;
};

export function ImageAttachments({
  cardId,
  images,
  onError,
}: ImageAttachmentsProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [, startTransition] = React.useTransition();

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setIsUploading(true);
    onError(null);
    try {
      for (const file of list) {
        const prepared = await prepareImage(file);
        const result = await addCardImage({
          cardId,
          dataBase64: prepared.base64,
          mimeType: prepared.mimeType,
          width: prepared.width,
          height: prepared.height,
        });
        if (!result.ok) {
          onError(result.error);
          break;
        }
      }
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "画像を追加できませんでした",
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>図版（{images.length}）</Label>
        {images.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            長辺1600pxに縮小して保存されます
          </span>
        )}
      </div>

      {images.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {images.map((image) => (
            <li
              key={image.id}
              className="space-y-1.5 rounded-lg border border-border bg-card p-2"
            >
              <div className="relative overflow-hidden rounded-md bg-muted">
                <Image
                  src={`/api/images/${image.id}`}
                  alt={image.caption ?? "問題の図版"}
                  width={image.width ?? 800}
                  height={image.height ?? 600}
                  unoptimized
                  className="h-32 w-full object-contain"
                />
              </div>
              <Input
                defaultValue={image.caption ?? ""}
                placeholder="キャプション・出典"
                className="h-7 text-xs"
                onBlur={(event) => {
                  const caption = event.target.value;
                  if (caption === (image.caption ?? "")) return;
                  startTransition(async () => {
                    const result = await updateImageCaption({
                      imageId: image.id,
                      caption,
                    });
                    if (!result.ok) onError(result.error);
                  });
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {image.width && image.height
                    ? `${image.width}×${image.height} ・ `
                    : ""}
                  {formatBytes(image.size)}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition hover:text-destructive"
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deleteCardImage(image.id);
                      if (!result.ok) onError(result.error);
                    })
                  }
                >
                  <Trash2 className="size-3" />
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void upload(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-4 text-center transition-colors",
          isDragging && "border-primary bg-primary/5",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void upload(event.target.files);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {isUploading ? "アップロード中…" : "画像を追加"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          ここにドラッグしても追加できます（PNG / JPEG / WebP）
        </p>
      </div>
    </div>
  );
}
