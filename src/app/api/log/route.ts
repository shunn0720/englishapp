import { NextRequest, NextResponse } from "next/server";
import { logToNotion } from "@/lib/notion";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, student, ai, correct, category } = body;

    if (!question || !category) {
      return NextResponse.json(
        { error: "question and category are required" },
        { status: 400 }
      );
    }

    const validCategories = ["英作文", "単語", "長文"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    await logToNotion({
      question,
      student: student || "",
      ai: ai || "",
      correct: correct ?? true,
      category,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in /api/log:", error);
    return NextResponse.json(
      { error: "Failed to save log to Notion" },
      { status: 500 }
    );
  }
}
