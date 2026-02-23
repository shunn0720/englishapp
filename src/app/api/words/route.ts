import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

interface WordQuestion {
  id: number;
  type: "jp_to_en" | "en_to_jp" | "fill_blank";
  q: string;
  a: string;
  hint?: string;
}

interface SubmitItem {
  id: number;
  studentAnswer: string;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/^to\s+/, "");
}

// GET /api/words — Generate 10 vocabulary questions (unit-aware)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 20 quiz generations per user per hour
    const rl = rateLimit(`words:${session.user.id}`, 20, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。しばらくしてからお試しください。" },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get("unitId");

    let unitPrompt = "中学3年〜高校1年レベルの英単語を出題してください。";

    if (unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        select: { name: true, nameEn: true, grade: true },
      });
      if (unit) {
        unitPrompt = `「${unit.name}」（${unit.nameEn}）の単元に関する英単語を出題してください。
この単元は${unit.grade}レベルです。${unit.name}で学習する文法・語彙に関連した問題を出してください。`;
      }
    }

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `あなたは英語学習の家庭教師です。英単語クイズを10問生成してください。

${unitPrompt}

以下の3タイプを混合させてください:
- "jp_to_en": 日本語の意味を見て英単語を答える
- "en_to_jp": 英単語を見て日本語の意味を答える
- "fill_blank": 英単語のスペル穴埋め（ヒント付き）

必ず以下のJSON形式で回答してください:
{
  "questions": [
    { "id": 1, "type": "jp_to_en", "q": "勉強する", "a": "study" },
    { "id": 2, "type": "en_to_jp", "q": "beautiful", "a": "美しい" },
    { "id": 3, "type": "fill_blank", "q": "b _ _ _ t i f u l", "a": "beautiful", "hint": "美しい" },
    ...
  ]
}
合計10問、各タイプが少なくとも2問以上含まれるようにしてください。idは1〜10の連番にしてください。`,
        },
        {
          role: "user",
          content: "10問の英単語クイズを生成してください。",
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No response from OpenAI");

    const parsed = JSON.parse(content) as { questions: WordQuestion[] };

    // Save questions server-side for tamper-proof grading
    const pendingQuiz = await prisma.pendingQuiz.create({
      data: {
        studentId: session.user.id,
        unitId: unitId || null,
        type: "WORDS",
        questions: JSON.parse(JSON.stringify(parsed.questions)),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Return questions without answers
    const questionsWithoutAnswers = parsed.questions.map((q) => ({
      id: q.id,
      type: q.type,
      q: q.q,
      hint: q.hint,
    }));

    return NextResponse.json({
      quizId: pendingQuiz.id,
      questions: questionsWithoutAnswers,
    });
  } catch (error) {
    console.error("Error in GET /api/words:", error);
    return NextResponse.json(
      { error: "Failed to generate word quiz" },
      { status: 500 }
    );
  }
}

// POST /api/words — Score answers using server-stored correct answers
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { quizId, items } = body as { quizId: string; items: SubmitItem[] };

    if (!quizId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "quizId and items array are required" },
        { status: 400 }
      );
    }

    // Fetch server-stored questions
    const pendingQuiz = await prisma.pendingQuiz.findUnique({
      where: { id: quizId },
    });

    if (!pendingQuiz || pendingQuiz.studentId !== session.user.id) {
      return NextResponse.json(
        { error: "Quiz not found or unauthorized" },
        { status: 404 }
      );
    }

    if (pendingQuiz.expiresAt < new Date()) {
      await prisma.pendingQuiz.delete({ where: { id: quizId } });
      return NextResponse.json(
        { error: "Quiz expired. Please generate a new one." },
        { status: 410 }
      );
    }

    const serverQuestions = pendingQuiz.questions as unknown as WordQuestion[];

    // Build answer map from server-stored data
    const answerMap = new Map<number, WordQuestion>();
    for (const q of serverQuestions) {
      answerMap.set(q.id, q);
    }

    const results = items.map((item) => {
      const serverQ = answerMap.get(item.id);
      if (!serverQ) return { id: item.id, correct: false, correctAnswer: "?" };
      const correct = normalize(item.studentAnswer) === normalize(serverQ.a);
      return { id: item.id, correct, correctAnswer: serverQ.a };
    });

    const score = results.filter((r) => r.correct).length;

    // Save quiz session
    await prisma.quizSession.create({
      data: {
        studentId: session.user.id,
        unitId: pendingQuiz.unitId,
        type: "WORDS",
        score,
        total: results.length,
        answers: {
          create: items.map((item, index) => {
            const serverQ = answerMap.get(item.id);
            return {
              questionIndex: index,
              question: serverQ?.q || "",
              studentAnswer: item.studentAnswer,
              correctAnswer: serverQ?.a || "",
              isCorrect: normalize(item.studentAnswer) === normalize(serverQ?.a || ""),
            };
          }),
        },
      },
    });

    // Clean up pending quiz
    await prisma.pendingQuiz.delete({ where: { id: quizId } });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error in POST /api/words:", error);
    return NextResponse.json(
      { error: "Failed to score word quiz" },
      { status: 500 }
    );
  }
}
