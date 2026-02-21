import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/classes — List teacher's classes
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classes = await prisma.class.findMany({
      where: { teacherId: session.user.id },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ classes });
  } catch (error) {
    console.error("Error in GET /api/classes:", error);
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
  }
}

// POST /api/classes — Create a new class (teacher only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "TEACHER") {
      return NextResponse.json({ error: "先生のみクラスを作成できます" }, { status: 403 });
    }

    const { name } = await request.json();
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "クラス名は必須です" }, { status: 400 });
    }

    const cls = await prisma.class.create({
      data: {
        name: name.trim(),
        teacherId: session.user.id,
      },
    });

    return NextResponse.json(cls);
  } catch (error) {
    console.error("Error in POST /api/classes:", error);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
