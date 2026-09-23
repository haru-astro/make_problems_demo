"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { CURRENT_USER_COOKIE } from "@/lib/session";
import type { ActionResult } from "@/app/actions/cards";

export async function switchUser(userId: string): Promise<ActionResult> {
  try {
    const id = z.string().min(1).parse(userId);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) return { ok: false, error: "ユーザーが見つかりません" };

    const cookieStore = await cookies();
    cookieStore.set(CURRENT_USER_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "ユーザーを切り替えられませんでした",
    };
  }
}

const createUserSchema = z.object({
  name: z.string().trim().min(1, "名前を入力してください").max(60),
});

export async function createUser(input: unknown): Promise<ActionResult> {
  try {
    const data = createUserSchema.parse(input);
    await prisma.user.create({ data: { name: data.name } });
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        error: error.issues[0]?.message ?? "入力内容を確認してください",
      };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "メンバーを追加できませんでした",
    };
  }
}
