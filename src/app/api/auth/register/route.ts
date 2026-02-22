import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const TEACHER_SECRET = process.env.TEACHER_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 registrations per IP per 15 minutes
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const rl = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。しばらくしてからお試しください。" },
        { status: 429 }
      );
    }

    const { name, email, password, role, teacherSecret } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "名前、メール、パスワードは必須です" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上必要です" },
        { status: 400 }
      );
    }

    // Determine role: TEACHER requires correct secret
    let assignedRole: "TEACHER" | "STUDENT" = "STUDENT";
    if (role === "TEACHER") {
      if (!TEACHER_SECRET || teacherSecret !== TEACHER_SECRET) {
        return NextResponse.json(
          { error: "先生用シークレットコードが正しくありません" },
          { status: 403 }
        );
      }
      assignedRole = "TEACHER";
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: assignedRole,
      },
    });

    return NextResponse.json({ id: user.id, email: user.email, role: user.role });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "登録に失敗しました" },
      { status: 500 }
    );
  }
}
