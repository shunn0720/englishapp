import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteCode } = await request.json();
    if (!inviteCode || typeof inviteCode !== "string") {
      return NextResponse.json({ error: "招待コードは必須です" }, { status: 400 });
    }

    const cls = await prisma.class.findUnique({
      where: { inviteCode: inviteCode.trim() },
      select: { id: true, name: true },
    });

    if (!cls) {
      return NextResponse.json({ error: "招待コードが見つかりません" }, { status: 404 });
    }

    const existing = await prisma.classMember.findUnique({
      where: {
        classId_studentId: {
          classId: cls.id,
          studentId: session.user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "既にこのクラスに参加しています" }, { status: 409 });
    }

    await prisma.classMember.create({
      data: {
        classId: cls.id,
        studentId: session.user.id,
      },
    });

    return NextResponse.json({ className: cls.name });
  } catch (error) {
    console.error("Error in POST /api/classes/join:", error);
    return NextResponse.json({ error: "参加に失敗しました" }, { status: 500 });
  }
}
