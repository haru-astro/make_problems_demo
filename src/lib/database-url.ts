/**
 * 環境変数に貼られた接続文字列を整える。
 *
 * 管理画面へ値を貼るときに前後のクォートやキー名が一緒に入ってしまうことが多く、
 * そのままだと Prisma が P1013（スキームが認識できない）で停止するため、
 * よくある形を受け付けられるようにしておく。
 */
export function normalizeDatabaseUrl(raw: string | undefined | null) {
  if (!raw) return undefined;

  let value = raw.trim();
  if (!value) return undefined;

  // psql 'postgresql://...' の形で配布されることがある
  const psqlCommand = value.match(/^psql\s+(.+)$/i);
  if (psqlCommand) value = psqlCommand[1].trim();

  // DATABASE_URL=postgresql://... のようにキー名ごと貼られた場合
  value = value.replace(/^[A-Za-z][A-Za-z0-9_]*=/, "");

  // 前後を囲むクォート
  value = value.replace(/^(['"])([\s\S]*)\1$/, "$2");

  return value.trim() || undefined;
}
