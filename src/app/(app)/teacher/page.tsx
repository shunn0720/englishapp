import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import CreateClassForm from "./CreateClassForm";

export default async function TeacherDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const classes = await prisma.class.findMany({
    where: { teacherId: session.user.id },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="section">
      <h2 className="section-title">👨‍🏫 先生ダッシュボード</h2>

      <CreateClassForm />

      <div className="teacher-classes">
        <h3 className="subsection-title">クラス一覧</h3>
        {classes.length === 0 ? (
          <p className="section-desc">まだクラスがありません。上のフォームから作成してください。</p>
        ) : (
          <div className="class-grid">
            {classes.map((cls) => (
              <Link
                key={cls.id}
                href={`/teacher/class/${cls.id}`}
                className="class-card"
              >
                <div className="class-card-header">
                  <span className="class-name">{cls.name}</span>
                  <span className="class-member-count">
                    {cls._count.members}人
                  </span>
                </div>
                <div className="class-invite-code">
                  招待コード: <code>{cls.inviteCode}</code>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
