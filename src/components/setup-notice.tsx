import { Database } from "lucide-react";

/** DBに接続できないときに表示するセットアップ手順 */
export function SetupNotice({ message }: { message: string }) {
  const steps = [
    ["1. PostgreSQL を起動", "brew services start postgresql@17"],
    ["2. テーブルを作成", "npx prisma migrate deploy"],
    ["3. デモデータを投入", "npm run db:seed"],
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300">
          <Database className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">
            データベースに接続できませんでした
          </h1>
          <p className="text-xs text-muted-foreground">
            以下の手順でセットアップしてからページを再読み込みしてください。
          </p>
        </div>
      </div>

      <ol className="space-y-3">
        {steps.map(([label, command]) => (
          <li key={label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-sm font-medium">{label}</p>
            <code className="mt-1 block rounded bg-muted px-2 py-1 font-mono text-xs">
              {command}
            </code>
          </li>
        ))}
      </ol>

      <details className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">
          エラーの詳細
        </summary>
        <pre className="mt-2 whitespace-pre-wrap break-words font-mono">
          {message}
        </pre>
      </details>
    </main>
  );
}
