# English Learning App

塾・家庭教師向けの AI 英語学習アプリ。

単元別のクイズを AI が自動生成し、先生が生徒の進捗を管理できます。

## 主な機能

**生徒**
- 単語クイズ（単元ごとに AI が自動生成）
- 英作文添削
- 長文要約
- 写真クイズ（GPT-4o Vision）
- レベル診断テスト

**先生**
- クラス作成・招待コード発行
- 生徒の進捗・スコア一覧

中1〜高2 の英語文法 30 単元に対応。

## 技術スタック

- **Next.js 16** (App Router / Turbopack) + React 19 + TypeScript
- **NextAuth v5** (Google OAuth + Email/Password)
- **PostgreSQL** + Prisma v7 (`@prisma/adapter-pg`)
- **OpenAI** GPT-4o / GPT-4o-mini

## ローカル開発

### 前提条件

- Node.js 20+
- PostgreSQL（ローカル or [Railway](https://railway.app)）
- [OpenAI API キー](https://platform.openai.com/api-keys)

### セットアップ

```bash
git clone https://github.com/shunn0720/englishapp.git
cd englishapp
npm install --legacy-peer-deps

cp .env.example .env
# .env を編集して各値を入力

npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed

npm run dev
```

http://localhost:3000 で起動します。

## Railway デプロイ

### 1. プロジェクト作成

1. [Railway](https://railway.app) にログイン
2. **New Project** → **Deploy from GitHub repo** → `shunn0720/englishapp` を選択
3. **Add PostgreSQL** プラグインを追加

### 2. 環境変数の設定

Railway ダッシュボードの **Variables** タブで以下を設定：

| 変数名 | 値 |
|---|---|
| `DATABASE_URL` | PostgreSQL プラグインが自動設定（`${{Postgres.DATABASE_URL}}` で参照） |
| `AUTH_SECRET` | `openssl rand -hex 32` で生成した値 |
| `OPENAI_API_KEY` | OpenAI API キー |
| `NEXT_PUBLIC_APP_URL` | Railway が割り当てるドメイン（例: `https://xxxxx.up.railway.app`） |
| `AUTH_GOOGLE_ID` | Google OAuth クライアント ID（任意） |
| `AUTH_GOOGLE_SECRET` | Google OAuth クライアントシークレット（任意） |

### 3. デプロイ

`railway.toml` が自動でビルド・デプロイを制御します：

- **ビルド**: `prisma generate` → `next build`
- **起動**: `prisma migrate deploy` → `prisma db seed` → `next start`

push するだけで自動デプロイされます。

## 環境変数一覧

| 変数名 | 必須 | 説明 |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL 接続文字列 |
| `OPENAI_API_KEY` | Yes | OpenAI API キー |
| `AUTH_SECRET` | Yes | NextAuth シークレット |
| `NEXT_PUBLIC_APP_URL` | Yes | アプリの公開 URL |
| `AUTH_GOOGLE_ID` | No | Google OAuth クライアント ID |
| `AUTH_GOOGLE_SECRET` | No | Google OAuth シークレット |

## プロジェクト構成

```
src/
├── app/
│   ├── (app)/              # 認証済みルート
│   │   ├── page.tsx        # 単元一覧（生徒ホーム）
│   │   ├── quiz/[type]/    # クイズ実行
│   │   ├── join/           # クラス参加
│   │   └── teacher/        # 先生ダッシュボード
│   ├── auth/               # ログイン・新規登録
│   └── api/                # API エンドポイント
├── components/             # UI コンポーネント
├── lib/prisma.ts           # DB クライアント
├── auth.ts                 # NextAuth 設定
└── middleware.ts            # 認証ガード
prisma/
├── schema.prisma           # DB スキーマ
└── seed.ts                 # 初期データ（30 単元）
```
