import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { BoardUser } from "@/lib/board";

export const CURRENT_USER_COOKIE = "jao_current_user";

/**
 * 認証は未実装のため、操作者はCookieで切り替える。
 * Cookieが無い / 無効な場合は最初に登録されたユーザーを使う。
 */
export async function getCurrentUser(): Promise<BoardUser | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(CURRENT_USER_COOKIE)?.value;

  if (id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });
    if (user) return user;
  }

  return prisma.user.findFirst({
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function requireCurrentUser(): Promise<BoardUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error(
      "ユーザーが登録されていません。`npm run db:seed` を実行してください。",
    );
  }
  return user;
}
