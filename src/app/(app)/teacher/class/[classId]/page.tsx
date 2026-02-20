import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ classId: string }>;
}

export default async function ClassDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { classId } = await params;

  const cls = await prisma.class.findUnique({
    where: { id: classId, teacherId: session.user.id },
    include: {
      members: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              quizSessions: {
                orderBy: { createdAt: "desc" },
                take: 20,
                include: {
                  unit: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!cls) notFound();

  return (
    <section className="section">
      <Link href="/teacher" className="back-link">
        ← ダッシュボードに戻る
      </Link>

      <h2 className="section-title">{cls.name}</h2>
      <div className="class-info">
        <span className="keyword-chip">招待コード: {cls.inviteCode}</span>
        <span className="keyword-chip">{cls.members.length}人の生徒</span>
      </div>

      {cls.members.length === 0 ? (
        <p className="section-desc">
          まだ生徒がいません。招待コード <code>{cls.inviteCode}</code> を生徒に共有してください。
        </p>
      ) : (
        <div className="student-list">
          {cls.members.map((member) => {
            const student = member.student;
            const totalSessions = student.quizSessions.length;
            const avgScore =
              totalSessions > 0
                ? Math.round(
                    student.quizSessions.reduce(
                      (sum, s) => sum + (s.score / s.total) * 100,
                      0
                    ) / totalSessions
                  )
                : 0;

            return (
              <div key={student.id} className="student-card">
                <div className="student-header">
                  <span className="student-name">{student.name || student.email}</span>
                  <span className="student-stats">
                    {totalSessions}回 / 平均 {avgScore}%
                  </span>
                </div>
                {student.quizSessions.length > 0 && (
                  <div className="student-sessions">
                    {student.quizSessions.slice(0, 5).map((s) => (
                      <div key={s.id} className="session-row">
                        <span className="session-unit">{s.unit?.name || "一般"}</span>
                        <span className="session-type">{s.type}</span>
                        <span
                          className="session-score"
                          style={{
                            color:
                              s.score / s.total >= 0.8
                                ? "#10b981"
                                : s.score / s.total >= 0.5
                                ? "#f59e0b"
                                : "#ef4444",
                          }}
                        >
                          {s.score}/{s.total}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
