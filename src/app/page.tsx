import { Board } from "@/components/board/board";
import { SetupNotice } from "@/components/setup-notice";
import { getCards, getTags, getUsers } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import type { BoardCard, BoardTag, BoardUser } from "@/lib/board";

export const dynamic = "force-dynamic";

type BoardData = {
  cards: BoardCard[];
  users: BoardUser[];
  tags: BoardTag[];
  currentUser: BoardUser | null;
};

/** DB未起動でもセットアップ手順を案内できるよう、取得失敗を値として扱う */
async function loadBoard(): Promise<
  { ok: true; data: BoardData } | { ok: false; error: string }
> {
  try {
    const [cards, users, tags, currentUser] = await Promise.all([
      getCards(),
      getUsers(),
      getTags(),
      getCurrentUser(),
    ]);
    return { ok: true, data: { cards, users, tags, currentUser } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default async function BoardPage() {
  const result = await loadBoard();

  if (!result.ok) return <SetupNotice message={result.error} />;

  return (
    <Board
      cards={result.data.cards}
      users={result.data.users}
      tags={result.data.tags}
      currentUser={result.data.currentUser}
    />
  );
}
