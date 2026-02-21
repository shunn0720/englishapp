import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const units = await prisma.unit.findMany({
      where: { subject: { name: "英語" } },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        nameEn: true,
        order: true,
        grade: true,
      },
    });

    return NextResponse.json({ units });
  } catch (error) {
    console.error("Error in GET /api/units:", error);
    return NextResponse.json(
      { error: "Failed to fetch units" },
      { status: 500 }
    );
  }
}
