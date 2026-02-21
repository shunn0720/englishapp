# English Learning App

塾・家庭教師向けの英語学習アプリ。AIを活用した単元別クイズ出題と、先生による生徒進捗管理を提供します。

## 機能

### 生徒向け
- **単語クイズ** — 単元ごとの英単語・文法問題をAIが自動生成
- **英作文添削** — 英作文をAIがリアルタイムで添削・フィードバック
- **要約練習** — 英文要約スキルのトレーニング
- **写真クイズ** — GPT-4o Visionを使った画像認識ベースの出題
- **レベルテスト** — 実力診断テスト

### 先生向け
- **クラス管理** — クラス作成・招待コード発行
- **生徒進捗ダッシュボード** — クイズ履歴・平均スコアの一覧表示

### 単元構成
中1〜高2の英語文法30単元に対応（be動詞、一般動詞、三単現、不定詞、関係代名詞、仮定法 など）

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router, Turbopack) |
| 言語 | TypeScript 5.9, React 19 |
| 認証 | NextAuth v5 beta (Google OAuth + Email/Password) |
| データベース | PostgreSQL + Prisma v7 (@prisma/adapter-pg) |
| AI | OpenAI GPT-4o (Vision), GPT-4o-mini (テキスト生成) |

## セットアップ

### 前提条件
- Node.js 20+
- PostgreSQL データベース（[Railway](https://railway.app) 推奨）
- OpenAI API キー
- Google OAuth クレデンシャル（任意）

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/shunn0720/englishapp.git
cd englishapp

# 依存パッケージをインストール
npm install --legacy-peer-deps

# 環境変数を設定
cp .env.example .env
# .env を編集して各値を入力

# Prisma クライアントを生成
npx prisma generate

# データベースのマイグレーション
npx prisma migrate dev --name init

# シードデータ投入（英語30単元）
npx prisma db seed
```

### 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアプリが起動します。

## 環境変数

| 変数名 | 説明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 接続文字列 |
| `OPENAI_API_KEY` | OpenAI API キー |
| `AUTH_SECRET` | NextAuth シークレット（`openssl rand -hex 32` で生成） |
| `AUTH_GOOGLE_ID` | Google OAuth クライアントID（任意） |
| `AUTH_GOOGLE_SECRET` | Google OAuth クライアントシークレット（任意） |
| `NEXT_PUBLIC_APP_URL` | アプリのURL（デフォルト: `http://localhost:3000`） |

## プロジェクト構成

```
src/
├── app/
│   ├── (app)/              # 認証済みルート
│   │   ├── page.tsx        # 生徒ホーム（単元一覧）
│   │   ├── quiz/[type]/    # クイズページ
│   │   ├── join/           # 招待コードでクラス参加
│   │   └── teacher/        # 先生ダッシュボード
│   ├── auth/               # 認証ページ（ログイン・新規登録）
│   ├── api/                # APIルート
│   └── globals.css
├── components/             # UIコンポーネント
│   ├── NavBar.tsx
│   ├── UnitSelector.tsx
│   ├── WordsPanel.tsx
│   ├── EssayPanel.tsx
│   ├── SummaryPanel.tsx
│   └── PhotoQuizPanel.tsx
├── lib/prisma.ts           # Prisma クライアント
├── auth.ts                 # NextAuth 設定
└── middleware.ts            # ルート保護
prisma/
├── schema.prisma           # データベーススキーマ
└── seed.ts                 # シードデータ
```

## ライセンス

Private
