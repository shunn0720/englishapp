import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/level-test — Generate 10 diagnostic questions
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `あなたは英語学習の診断テストを作成するプロの家庭教師です。
生徒のレベルを判定するために、易しい問題から難しい問題まで混ぜた10問の診断テストを作成してください。

レベル分布:
- beginner（初級: 中学1-2年レベル）: 3問
- intermediate（中級: 中学3年〜高校1年レベル）: 4問
- advanced（上級: 高校2-3年〜大学入試レベル）: 3問

問題タイプ:
- "jp_to_en": 日本語→英単語
- "en_to_jp": 英単語→日本語の意味
- "grammar": 文法問題（空欄補充）

必ず以下のJSON形式で回答してください:
{
  "questions": [
    { "id": 1, "level": "beginner", "type": "jp_to_en", "q": "犬", "a": "dog" },
    { "id": 2, "level": "intermediate", "type": "grammar", "q": "I ___ to school yesterday. (go の過去形)", "a": "went" },
    { "id": 3, "level": "advanced", "type": "en_to_jp", "q": "elaborate", "a": "精巧な／詳しく述べる" },
    ...
  ]
}

idは1〜10の連番にしてください。
各レベルが最低2問以上含まれるようにしてください。
問題は易しい順に並べてください。`,
        },
        { role: "user", content: "レベル診断テストを10問生成してください。" },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No response from OpenAI");

    const parsed = JSON.parse(content);
    return NextResponse.json({ questions: parsed.questions });
  } catch (error) {
    console.error("Error in GET /api/level-test:", error);
    return NextResponse.json(
      { error: "Failed to generate level test" },
      { status: 500 }
    );
  }
}

// POST /api/level-test — Score answers and determine level
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body as {
      items: {
        id: number;
        level: string;
        question: string;
        studentAnswer: string;
        correctAnswer: string;
      }[];
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    const normalize = (s: string) =>
      s.trim().toLowerCase().replace(/^to\s+/, "").replace(/[。、．，]/g, "");

    const results = items.map((item) => ({
      id: item.id,
      level: item.level,
      correct: normalize(item.studentAnswer) === normalize(item.correctAnswer),
      correctAnswer: item.correctAnswer,
    }));

    const scoreByLevel = {
      beginner: { correct: 0, total: 0 },
      intermediate: { correct: 0, total: 0 },
      advanced: { correct: 0, total: 0 },
    };

    for (const r of results) {
      const lvl = r.level as keyof typeof scoreByLevel;
      if (scoreByLevel[lvl]) {
        scoreByLevel[lvl].total++;
        if (r.correct) scoreByLevel[lvl].correct++;
      }
    }

    const totalCorrect = results.filter((r) => r.correct).length;
    const beginnerRate = scoreByLevel.beginner.total > 0
      ? scoreByLevel.beginner.correct / scoreByLevel.beginner.total : 0;
    const intermediateRate = scoreByLevel.intermediate.total > 0
      ? scoreByLevel.intermediate.correct / scoreByLevel.intermediate.total : 0;
    const advancedRate = scoreByLevel.advanced.total > 0
      ? scoreByLevel.advanced.correct / scoreByLevel.advanced.total : 0;

    let determinedLevel: "beginner" | "intermediate" | "advanced";
    if (advancedRate >= 0.6 && intermediateRate >= 0.7) {
      determinedLevel = "advanced";
    } else if (intermediateRate >= 0.5 && beginnerRate >= 0.7) {
      determinedLevel = "intermediate";
    } else {
      determinedLevel = "beginner";
    }

    // Save to DB
    await prisma.quizSession.create({
      data: {
        studentId: session.user.id,
        type: "LEVEL_TEST",
        score: totalCorrect,
        total: items.length,
        answers: {
          create: items.map((item, index) => ({
            questionIndex: index,
            question: item.question,
            studentAnswer: item.studentAnswer,
            correctAnswer: item.correctAnswer,
            isCorrect: normalize(item.studentAnswer) === normalize(item.correctAnswer),
          })),
        },
      },
    });

    return NextResponse.json({
      results,
      scoreByLevel,
      totalCorrect,
      totalQuestions: items.length,
      determinedLevel,
    });
  } catch (error) {
    console.error("Error in POST /api/level-test:", error);
    return NextResponse.json(
      { error: "Failed to score level test" },
      { status: 500 }
    );
  }
}
