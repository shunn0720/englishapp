import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import UnitSelector from "@/components/UnitSelector";
import type { UnitInfo } from "@/types/quiz";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const units = await prisma.unit.findMany({
    where: { subject: { name: "英語" } },
    orderBy: { order: "asc" },
    include: {
      quizSessions: {
        where: { studentId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { score: true, total: true },
      },
    },
  });

  const unitInfos: UnitInfo[] = units.map((u) => ({
    id: u.id,
    name: u.name,
    nameEn: u.nameEn,
    order: u.order,
    grade: u.grade,
    lastScore: u.quizSessions[0]?.score,
    lastTotal: u.quizSessions[0]?.total,
  }));

  return <UnitSelector units={unitInfos} />;
}
