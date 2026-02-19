import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { logToNotion } from "@/lib/notion";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { japanese, level } = body;

    if (!japanese || typeof japanese !== "string" || japanese.trim() === "") {
      return NextResponse.json(
        { error: "japanese field is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const studentLevel = level || "intermediate";
    const levelDesc = {
      beginner:
        "生徒は初級レベル（中学1-2年）です。文法説明はとても分かりやすく、基本的な文型で解説してください。類題も簡単な日本語文にしてください。",
      intermediate:
        "生徒は中級レベル（中学3年〜高校1年）です。標準的な文法説明をし、やや応用的な類題を出してください。",
      advanced:
        "生徒は上級レベル（高校2-3年〜大学入試）です。高度な文法事項や表現のニュアンスまで解説し、難しめの類題を出してください。",
    }[studentLevel] || "";

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
        {
          role: "user",
          content: japanese,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content) as {
      ai_answer: string;
      explanation: string;
      related_questions: string[];
    };

    await logToNotion({
      question: japanese,
      student: japanese,
      ai: parsed.ai_answer,
      correct: true,
      category: "英作文",
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
