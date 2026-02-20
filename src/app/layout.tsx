import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Learning AI",
  description: "AIを活用した英語学習プラットフォーム。単元別の単語クイズ・英作文添削・写真出題で効率的に学習。",
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
