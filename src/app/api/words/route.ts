import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { logToNotion } from "@/lib/notion";

interface WordQuestion {
  id: number;
  type: "jp_to_en" | "en_to_jp" | "fill_blank";
  q: string;
  a: string;
  hint?: string;
}

interface SubmitItem {
  id: number;
  type: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/^to\s+/, "");
}

// GET /api/words — Generate 10 vocabulary questions (level-aware)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level") || "intermediate";

    const levelPrompt = {
      beginner: `中学1〜2年生レベルの簡単な英単語（例: dog, book, run, happy, eat）を出題してください。
基本的な名詞・動詞・形容詞を中心に出してください。`,
      intermediate: `中学3年〜高校1年レベルの英単語（例: experience, environment, opportunity, valuable）を出題してください。
日常会話や学校の教科書に出てくる標準的な単語を中心に出してください。`,
      advanced: `高校2年〜大学入試レベルの英単語（例: elaborate, inevitable, perspective, comprehend, scrutiny）を出題してください。
大学受験や英検準1級〜1級レベルの難易度の高い単語を出してください。`,
    }[level] || "中学3年〜高校1年レベルの英単語を出題してください。";

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `あなたは英語学習の家庭教師です。英単語クイズを10問生成してください。

${levelPrompt}

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
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content) as { questions: WordQuestion[] };
    return NextResponse.json({ questions: parsed.questions });
  } catch (error) {
    console.error("Error in GET /api/words:", error);
    return NextResponse.json(
      { error: "Failed to generate word quiz" },
      { status: 500 }
    );
  }
}

// POST /api/words — Score answers and log to Notion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body as { items: SubmitItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }

    const results = [];

    for (const item of items) {
      const isCorrect =
        normalize(item.studentAnswer) === normalize(item.correctAnswer);

      results.push({
        id: item.id,
        correct: isCorrect,
        correctAnswer: item.correctAnswer,
      });

      await logToNotion({
        question: item.question,
        student: item.studentAnswer,
        ai: item.correctAnswer,
        correct: isCorrect,
        category: "単語",
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error in POST /api/words:", error);
    return NextResponse.json(
      { error: "Failed to score word quiz" },
      { status: 500 }
    );
  }
}
