# 作問カンバン（JAO）

4択試験問題を **チームで共同作成** するためのカンバンボードです。
アイデア出し → 問題作成（清書） → レビュー → 完成 までの流れを、ドラッグ＆ドロップで管理できます。

## 主な機能

| 機能 | 内容 |
| --- | --- |
| カンバンボード | `アイデア` / `問題作成中` / `レビュー中` / `完成` の4カラム。カードはドラッグ＆ドロップで移動でき、カラム内の並び順も保存されます |
| 4択問題フォーマット | 問題文・選択肢1〜4・正解（ラジオボタンで指定）・解説/出典をカード詳細で編集 |
| 図版の添付 | 1問に複数枚の画像を添付。ブラウザ側で長辺1600pxに縮小してからDBに保存し、キャプション・出典も記録できます |
| 問題番号の自動採番 | 「完成」カラムの並び順から `問1, 問2…` を自動計算。手動入力がないため競合せず、並べ替えると番号が連動してずれます |
| CSV出力 | 完成した問題を番号順に書き出し（図版は含みません）。Excelで文字化けしないUTF-8 BOM付き |
| 正解位置の偏りチェック | 完成問題の正解番号の分布を表示し、特定の番号に4割以上集中していたら警告します |
| 進捗の可視化 | カードに入力率のバーを表示し、必須項目が揃うと緑のチェックが付きます |
| 担当者 | 作成者は自動記録。担当者はいつでも付け替え可能 |
| タグ | 分野・難易度などを自由に付与。入力時に既存タグをサジェスト、未登録の名前はその場で作成 |
| コメント | カードごとのレビューコメント。自分のコメントは削除可能（⌘/Ctrl + Enter で投稿） |
| 絞り込み | キーワード検索（タイトル・問題文・選択肢・解説）／担当者／タグ（AND条件）／未完成のみ |
| メンバー切り替え | 認証は未実装のため、操作中のユーザーをCookieで切り替えます。メンバーは名前だけで追加できます |
| ダーク/ライト | OSの設定に追従し、右上のボタンで切り替え（localStorageに保存） |

## 技術スタック

- Next.js 16（App Router / Server Actions）・TypeScript
- Tailwind CSS v4 ＋ shadcn/ui 準拠のコンポーネント（`src/components/ui`）・Lucide Icons
- PostgreSQL ＋ Prisma ORM
- @hello-pangea/dnd（ドラッグ＆ドロップ）
- Zod（Server Actions の入力検証）

## セットアップ（ローカル開発）

データベースは PostgreSQL を使います。Docker は不要で、Mac に直接インストールします。

```bash
# 1. PostgreSQL のインストールと起動（初回のみ）
brew install postgresql@17
brew services start postgresql@17
```

```bash
# 2. このアプリ用のデータベースを作る（初回のみ）
/opt/homebrew/opt/postgresql@17/bin/createdb jao
```

```bash
# 3. 依存関係のインストールと環境変数の用意
npm install
cp .env.example .env   # 既に .env がある場合は不要
```

`.env` の `<ユーザー名>` は `whoami` の結果（Mac のログイン名）に置き換えてください。

```bash
# 4. テーブル作成とサンプルデータ投入（天文分野のデモ問題8問）
npx prisma migrate deploy
npm run db:seed
```

```bash
# 5. 開発サーバー
npm run dev   # http://localhost:3000
```

PostgreSQL を止めたいときは `brew services stop postgresql@17` です。

## 本番公開（GitHub + Vercel + クラウド DB）

アプリが見ているのは `.env` の接続先だけなので、**接続先を差し替えるだけ**で本番に移れます。

1. **クラウド DB を用意する** — [Neon](https://neon.tech) などで PostgreSQL を作成し、接続文字列を2種類コピーする
   - プール経由（ホスト名に `-pooler` が付く方）→ `DATABASE_URL`
   - 直接接続 → `DIRECT_URL`（マイグレーション用）
2. **GitHub にリポジトリを作って push する** — `.env` は `.gitignore` 済みなので公開されません
3. **Vercel でリポジトリを取り込む** — Environment Variables に `DATABASE_URL` と `DIRECT_URL` を登録する
4. **デプロイ** — `npm run build` が `prisma migrate deploy && next build` なので、push のたびにスキーマが本番へ自動反映されます
5. **初回だけ** ローカルから本番 DB を指定して `npm run db:seed` を実行するか、画面からメンバーを登録する

独自ドメインは Vercel のプロジェクト設定 → Domains から追加します。

> **公開前の注意**: 現状は認証がなく、URL を知っていれば誰でもカードを閲覧・編集・削除できます。デモ以外の用途では、認証（Cloudflare Access など）を入れてから公開してください。

## npm スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | マイグレーション適用 + 本番ビルド |
| `npm start` | 本番サーバー起動 |
| `npm run lint` | ESLint |
| `npm run db:deploy` | 既存のマイグレーションを適用 |
| `npm run db:migrate` | スキーマ変更から新しいマイグレーションを作成（開発時） |
| `npm run db:seed` | デモ用データ投入（既存データは削除されます） |
| `npm run db:studio` | Prisma Studio（DBの中身をブラウザで確認） |

## 今後の予定（Cloudflare への移行）

現在はデモ段階のため、**Neon（PostgreSQL）+ Vercel** で動かす構成になっています。
本運用では以下への移行を予定しています。移行時はデータベースまわりの書き換えが必要です。

| 用途 | 現在（デモ） | 予定 |
| --- | --- | --- |
| データベース | Neon（PostgreSQL） | Cloudflare D1（SQLite） |
| ホスティング | Vercel | Cloudflare Pages |
| 認証 | なし | Cloudflare Access |

移行時の主な作業は、`prisma/schema.prisma` の `provider` を `sqlite` に変更して D1 用アダプタを導入すること、`@opennextjs/cloudflare` で Next.js を Pages 向けにビルドすること、`src/lib/session.ts` の `getCurrentUser()` を Cloudflare Access が渡すヘッダーから利用者を判定する実装に差し替えることの3点です。

## ディレクトリ構成

```
prisma.config.ts         # Prisma の設定（スキーマ / マイグレーション / seed）
prisma/
  schema.prisma          # DBスキーマ（User / Card / Tag / Comment）
  migrations/            # 初期マイグレーション
  seed.ts                # サンプルデータ
  demo-figure.ts         # デモ用の図版（HR図の模式図）を生成
src/
  app/
    page.tsx             # ボード（Server Component でデータ取得）
    layout.tsx
    actions/             # Server Actions
      cards.ts           # カードの作成・更新・移動・削除
      comments.ts        # コメントの追加・削除
      images.ts          # 図版の追加・キャプション更新・削除
      users.ts           # 操作ユーザーの切り替え・メンバー追加
    api/
      images/[id]/       # 図版の配信（DBから読み出して返す）
  components/
    board/               # カンバン本体（Board / Column / Card / Dialog / Toolbar / 図版）
    ui/                  # shadcn/ui 準拠のプリミティブ
  lib/
    prisma.ts            # PrismaClient シングルトン
    queries.ts           # 一覧取得とシリアライズ
    session.ts           # 操作中ユーザー（Cookie）
    board.ts             # ステータス定義・型・採番・正解分布・入力完了判定
    csv.ts               # CSV の組み立てとダウンロード
    image.ts             # アップロード前の画像縮小（ブラウザ側）
```

## 設計メモ

- **カラム内の並び順**: 指定いただいたスキーマに `order: Int` を追加しています。ドラッグ後は移動元・移動先カラムの `order` をトランザクション内で振り直すため、並び順が壊れません。
- **絞り込み中のドラッグ**: 表示中のカードだけを見て位置を決めると実データとずれるため、ドロップ位置の直後にあるカードを基準に「実データ上の挿入位置」へ変換してから保存しています。
- **楽観的更新**: ドラッグ直後に画面を更新し、Server Action が失敗した場合はサーバーの状態へ戻します。
- **問題番号**: 番号を保存せず、「完成」カラムの `order` から毎回計算しています。保存しないので、複数人が同時に並べ替えても番号が衝突しません。差し戻すと自動的に番号が外れ、後続の番号が繰り上がります。
- **図版の保存先**: 画像本体は `CardImage.data`（PostgreSQL の bytea）に入れ、`/api/images/[id]` から配信しています。追加のストレージ契約が不要な代わりにDB容量を使うため、枚数が増えたら Cloudflare R2 などへの移行を検討してください（配信部分を差し替えるだけで済むよう、参照は画像IDのみにしてあります）。アップロード時はブラウザ側で長辺1600pxに縮小し、図やグラフの文字がつぶれないよう軽いPNGはPNGのまま保存します。SVGはスクリプトを埋め込めるため受け付けません。
- **認証**: 未実装です。`src/lib/session.ts` の `getCurrentUser()` を認証基盤に差し替えれば、Server Actions 側の作成者・コメント投稿者の解決はそのまま使えます。`User.email` は任意項目として残してあるので、Cloudflare Access が渡す識別子の保存先として使えます。
- **DB未起動時**: トップページはエラー画面ではなくセットアップ手順を表示します。
- **接続先の二本立て**: `DATABASE_URL`（アプリ用）と `DIRECT_URL`（マイグレーション用）を分けています。ローカルでは同じ値で構いませんが、サーバーレス環境ではアプリ側だけコネクションプールを経由させる必要があるため、この形にしてあります。
- **Prisma の設定**: `prisma.config.ts` に集約しています（Prisma 7 で廃止予定の `package.json#prisma` は使っていません）。設定ファイルを使うと Prisma が `.env` を自動読み込みしないため、先頭で `dotenv/config` を読み込んでいます。
