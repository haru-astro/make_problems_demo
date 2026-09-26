import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getImage } from "@/lib/image-storage";

/**
 * 画像の配信。画像IDごとに内容は変わらないため長期キャッシュを許可する。
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/images/[id]">,
) {
  const { id } = await context.params;

  const image = await prisma.cardImage.findUnique({
    where: { id },
    select: { storageKey: true, mimeType: true },
  });

  if (!image) return new Response("Not Found", { status: 404 });

  const data = await getImage(image.storageKey);
  if (!data) return new Response("Not Found", { status: 404 });

  return new Response(data, {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      // 万一の埋め込みスクリプト実行を防ぐ
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
