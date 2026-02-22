import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 20 summary requests per user per hour
    const rl = rateLimit(`summary:${session.user.id}`, 20, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。しばらくしてからお試しください。" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return NextResponse.json(
        { error: "text field is required" },
        { status: 400 }
      );
    }

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `あなたは英語学習の家庭教師です。生徒が入力した英語の長文を以下の形式で要約してください。

必ず以下のJSON形式で回答してください:
{
  "summary": "やさしい日本語での要約",
  "keywords": ["重要単語1", "重要単語2", ...],
  "reading": "英文全体のカタカナ読み（スペース区切り）"
}

要約は中学生でも分かるようにやさしい日本語で書いてください。
重要単語は5〜10個程度選んでください。
カタカナ読みは英文の発音を日本語のカタカナで表記してください。`,
        },
        { role: "user", content: text },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No response from OpenAI");

    const parsed = JSON.parse(content) as {
      summary: string;
      keywords: string[];
      reading: string;
    };

    await prisma.quizSession.create({
      data: {
        studentId: session.user.id,
        type: "SUMMARY",
        score: 1,
        total: 1,
        answers: {
          create: [{
            questionIndex: 0,
            question: text.slice(0, 500),
            studentAnswer: text.slice(0, 500),
            correctAnswer: parsed.summary.slice(0, 500),
            isCorrect: true,
          }],
        },
      },
    });

    return NextResponse.json({
      summary: parsed.summary,
      keywords: parsed.keywords,
      reading: parsed.reading,
    });
  } catch (error) {
    console.error("Error in /api/summary:", error);
    return NextResponse.json(
      { error: "Failed to process summary" },
      { status: 500 }
    );
  }
}
