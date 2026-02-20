import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import WordsPanel from "@/components/WordsPanel";
import EssayPanel from "@/components/EssayPanel";
import SummaryPanel from "@/components/SummaryPanel";
import PhotoQuizPanel from "@/components/PhotoQuizPanel";
import Link from "next/link";

interface Props {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ unitId?: string }>;
}

export default async function QuizPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { type } = await params;
  const { unitId } = await searchParams;

  const validTypes = ["words", "essay", "summary", "photo"];
  if (!validTypes.includes(type)) notFound();

  let unitName: string | undefined;
  if (unitId) {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { name: true },
    });
    unitName = unit?.name;
  }

  return (
    <div>
      <Link href="/" className="back-link">
        ← 単元一覧に戻る
      </Link>
      {type === "words" && <WordsPanel unitId={unitId} unitName={unitName} />}
      {type === "essay" && <EssayPanel unitId={unitId} unitName={unitName} />}
      {type === "summary" && <SummaryPanel />}
      {type === "photo" && <PhotoQuizPanel unitId={unitId} unitName={unitName} />}
    </div>
  );
}
