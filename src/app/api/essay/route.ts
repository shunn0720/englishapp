import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { japanese, unitId } = body;

    if (!japanese || typeof japanese !== "string" || japanese.trim() === "") {
      return NextResponse.json(
        { error: "japanese field is required" },
        { status: 400 }
      );
    }

    let levelDesc = "生徒は中級レベル（中学3年〜高校1年）です。標準的な文法説明をしてください。";

    if (unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        select: { name: true, nameEn: true, grade: true },
      });
      if (unit) {
        levelDesc = `生徒は「${unit.name}」（${unit.nameEn}）の単元を学習中です（${unit.grade}レベル）。
この単元で使う文法に注目して添削・解説してください。`;
      }
    }

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `あなたは英語学習の家庭教師です。生徒が入力した日本語文を正しい英語に翻訳し、文法の解説を日本語で行い、類題を3つ出してください。
${levelDesc}
必ず以下のJSON形式で回答してください:
{
  "ai_answer": "正しい英文",
  "explanation": "文法説明（日本語で）",
  "related_questions": ["類題1の日本語文", "類題2の日本語文", "類題3の日本語文"]
}`,
        },
        { role: "user", content: japanese },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No response from OpenAI");

    const parsed = JSON.parse(content) as {
      ai_answer: string;
      explanation: string;
      related_questions: string[];
    };

    await prisma.quizSession.create({
      data: {
        studentId: session.user.id,
        unitId: unitId || null,
        type: "ESSAY",
        score: 1,
        total: 1,
        answers: {
          create: [{
            questionIndex: 0,
            question: japanese,
            studentAnswer: japanese,
            correctAnswer: parsed.ai_answer,
            isCorrect: true,
          }],
        },
      },
    });

    return NextResponse.json({
      ai_answer: parsed.ai_answer,
      explanation: parsed.explanation,
      related_questions: parsed.related_questions,
    });
  } catch (error) {
    console.error("Error in /api/essay:", error);
    return NextResponse.json(
      { error: "Failed to process essay correction" },
      { status: 500 }
    );
  }
}
