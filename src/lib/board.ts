import { CardStatus } from "@prisma/client";

export const STATUS_ORDER: CardStatus[] = [
  CardStatus.IDEA,
  CardStatus.IN_PROGRESS,
  CardStatus.REVIEW,
  CardStatus.COMPLETED,
];

type StatusMeta = {
  label: string;
  description: string;
  /** カラムヘッダーのアクセント */
  dot: string;
  header: string;
  ring: string;
};

export const STATUS_META: Record<CardStatus, StatusMeta> = {
  IDEA: {
    label: "アイデア",
    description: "作問のネタ・素案",
    dot: "bg-slate-400",
    header: "text-slate-600 dark:text-slate-300",
    ring: "ring-slate-200 dark:ring-slate-700",
  },
  IN_PROGRESS: {
    label: "問題作成中",
    description: "問題文・選択肢を清書",
    dot: "bg-sky-500",
    header: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-200 dark:ring-sky-900",
  },
  REVIEW: {
    label: "レビュー中",
    description: "他メンバーによる確認",
    dot: "bg-amber-500",
    header: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-200 dark:ring-amber-900",
  },
  COMPLETED: {
    label: "完成",
    description: "出題可能な状態",
    dot: "bg-emerald-500",
    header: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-200 dark:ring-emerald-900",
  },
};

export const OPTION_LABELS = ["1", "2", "3", "4"] as const;

export type BoardUser = {
  id: string;
  name: string;
  email: string;
};

export type BoardTag = {
  id: string;
  name: string;
  category: string | null;
};

export type BoardComment = {
  id: string;
  content: string;
  createdAt: string;
  user: BoardUser;
};

export type BoardCard = {
  id: string;
  title: string;
  status: CardStatus;
  order: number;
  questionText: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  option4: string | null;
  correctOptionIndex: number | null;
  explanation: string | null;
  author: BoardUser;
  assignedTo: BoardUser | null;
  tags: BoardTag[];
  comments: BoardComment[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
};

/** 4択問題として必要な項目が埋まっているか */
export function isQuestionComplete(card: BoardCard) {
  return Boolean(
    card.questionText?.trim() &&
      card.option1?.trim() &&
      card.option2?.trim() &&
      card.option3?.trim() &&
      card.option4?.trim() &&
      card.correctOptionIndex &&
      card.correctOptionIndex >= 1 &&
      card.correctOptionIndex <= 4,
  );
}

/** 入力済み項目の割合（0〜1） */
export function completionRatio(card: BoardCard) {
  const fields = [
    card.questionText,
    card.option1,
    card.option2,
    card.option3,
    card.option4,
    card.correctOptionIndex ? String(card.correctOptionIndex) : null,
    card.explanation,
  ];
  const filled = fields.filter((f) => f && String(f).trim()).length;
  return filled / fields.length;
}
