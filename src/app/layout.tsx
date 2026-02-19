import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Learning AI — 英語学習ツール",
  description:
    "AIを活用した英語学習ツール。英作文添削・単語クイズ・長文要約の3つの機能で毎日5〜10分のトレーニング。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
