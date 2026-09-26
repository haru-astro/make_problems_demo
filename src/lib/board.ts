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
  email: string | null;
};

export type BoardTag = {
  id: string;
  name: string;
  category: string | null;
};

export type BoardImage = {
  id: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  size: number;
  caption: string | null;
  order: number;
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
  /** 完成したが出題には使わない問題 */
  excluded: boolean;
  /** 大問としてまとめたセットのID（単独問題は null） */
  groupId: string | null;
  /** セット内の並び順 */
  groupOrder: number;
  author: BoardUser;
  assignedTo: BoardUser | null;
  tags: BoardTag[];
  images: BoardImage[];
  comments: BoardComment[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
};

/** 問題番号。セット（大問）の場合は枝番が付く */
export type QuestionNumber = {
  /** 大問番号 */
  major: number;
  /** 大問の中の小問番号（単独問題は null） */
  minor: number | null;
  /** 表示用の文字列（例: 問3。セットの小問どうしは同じ番号になる） */
  label: string;
};

/**
 * 「完成」カラムの並び順から問題番号を決める。
 * 番号を保存せず毎回計算するため、並べ替えると自動的に振り直され、
 * 複数人が同時に編集しても番号が衝突しない。
 * セットにまとめたカードは1つの大問として扱い、小問に枝番を振る。
 * 「使用しない」にした問題は採番から外れる。
 */
export function questionNumbers(
  cards: BoardCard[],
): Map<string, QuestionNumber> {
  const target = cards
    .filter((card) => card.status === "COMPLETED" && !card.excluded)
    .sort((a, b) => a.order - b.order);

  const result = new Map<string, QuestionNumber>();
  const majorByGroup = new Map<string, number>();
  const minorByGroup = new Map<string, number>();
  let major = 0;

  for (const card of target) {
    if (!card.groupId) {
      major += 1;
      result.set(card.id, { major, minor: null, label: `問${major}` });
      continue;
    }

    // セットは最初に現れた位置で大問番号を確定し、以降は枝番だけ進める
    let groupMajor = majorByGroup.get(card.groupId);
    if (groupMajor === undefined) {
      major += 1;
      groupMajor = major;
      majorByGroup.set(card.groupId, groupMajor);
    }

    const minor = (minorByGroup.get(card.groupId) ?? 0) + 1;
    minorByGroup.set(card.groupId, minor);

    // セットは1つの大問なので、番号は小問どうしで共通にする
    result.set(card.id, { major: groupMajor, minor, label: `問${groupMajor}` });
  }

  return result;
}

/** セットの中で一緒に扱うカードを取り出す（セット内の順に並べる） */
export function groupMembers(cards: BoardCard[], groupId: string) {
  return cards
    .filter((card) => card.groupId === groupId)
    .sort((a, b) => a.groupOrder - b.groupOrder || a.order - b.order);
}

/** 正解番号の分布。4択の正解位置が偏っていないかの確認に使う */
export function answerDistribution(cards: BoardCard[]) {
  const counts = [0, 0, 0, 0];
  let total = 0;

  for (const card of cards) {
    if (card.status !== "COMPLETED" || card.excluded) continue;
    const index = card.correctOptionIndex;
    if (!index || index < 1 || index > 4) continue;
    counts[index - 1] += 1;
    total += 1;
  }

  const max = Math.max(...counts);
  // 完成問題が十分あるのに特定の番号へ4割以上集中していたら偏りとみなす
  const biased = total >= 8 && max / total > 0.4;

  return { counts, total, biased };
}

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
