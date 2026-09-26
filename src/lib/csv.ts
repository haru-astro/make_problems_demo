import { OPTION_LABELS, questionNumbers, type BoardCard } from "@/lib/board";

const HEADERS = [
  "問題番号",
  "大問番号",
  "小問番号",
  "タイトル",
  "問題文",
  "選択肢1",
  "選択肢2",
  "選択肢3",
  "選択肢4",
  "正解番号",
  "正解の本文",
  "解説・出典",
  "タグ",
  "作成者",
  "担当者",
  "図版枚数",
] as const;

/** カンマ・改行・引用符を含む値を CSV として安全な形にする */
function escape(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(cards: BoardCard[]) {
  const numbers = questionNumbers(cards);

  const rows = cards
    .filter((card) => numbers.has(card.id))
    .sort((a, b) => {
      const left = numbers.get(a.id);
      const right = numbers.get(b.id);
      if (!left || !right) return 0;
      return left.major - right.major || (left.minor ?? 0) - (right.minor ?? 0);
    })
    .map((card) => {
      const number = numbers.get(card.id);
      const options = [card.option1, card.option2, card.option3, card.option4];
      const answerIndex = card.correctOptionIndex;
      const answerText =
        answerIndex && answerIndex >= 1 && answerIndex <= OPTION_LABELS.length
          ? (options[answerIndex - 1] ?? "")
          : "";

      return [
        number?.label ?? "",
        number?.major ?? "",
        number?.minor ?? "",
        card.title,
        card.questionText ?? "",
        options[0] ?? "",
        options[1] ?? "",
        options[2] ?? "",
        options[3] ?? "",
        answerIndex ?? "",
        answerText,
        card.explanation ?? "",
        card.tags.map((tag) => tag.name).join(" / "),
        card.author.name,
        card.assignedTo?.name ?? "",
        card.images.length,
      ].map(escape).join(",");
    });

  return [HEADERS.join(","), ...rows].join("\r\n");
}

export function csvFileName(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `問題一覧_${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.csv`;
}

/** 完成した問題を CSV としてダウンロードする（ブラウザ側で実行） */
export function exportCards(cards: BoardCard[]) {
  const csv = buildCsv(cards);
  // Excel で開いたときに文字化けしないよう BOM を付ける
  const blob = new Blob([`﻿${csv}`], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = csvFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
