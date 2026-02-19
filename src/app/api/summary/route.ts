import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { logToNotion } from "@/lib/notion";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return NextResponse.json(
        { error: "text field is required and must be a non-empty string" },
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

    await logToNotion({
      question: text,
      student: text,
      ai: parsed.summary,
      correct: true,
      category: "長文",
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
