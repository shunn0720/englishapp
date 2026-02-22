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

    // Rate limit: 10 photo quiz requests per user per hour (uses gpt-4o)
    const rl = rateLimit(`photo-quiz:${session.user.id}`, 10, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。しばらくしてからお試しください。" },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const quizType = (formData.get("quizType") as string) || "mixed";
    const unitId = formData.get("unitId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "image file is required" }, { status: 400 });
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Supported formats: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Step 1: Extract content from image
    const extractionResult = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `あなたは英語教材の画像を読み取る専門家です。
画像に含まれる英単語、英文、日本語訳などのテキストをすべて抽出してください。

必ず以下のJSON形式で回答してください:
{
  "extracted_words": [
    { "english": "apple", "japanese": "りんご" }
  ],
  "extracted_sentences": [
    { "english": "I have a pen.", "japanese": "私はペンを持っています。" }
  ],
  "source_type": "wordbook" | "textbook" | "worksheet" | "other",
  "notes": "画像の内容についての補足"
}

もし日本語訳が画像内に見当たらない場合は、自分で適切な訳を付けてください。
画像から読み取れない場合は空の配列を返してください。`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "この画像の英語教材の内容を読み取ってください。" },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
    });

    const extractedContent = extractionResult.choices[0]?.message?.content;
    if (!extractedContent) throw new Error("Failed to extract content from image");

    const extracted = JSON.parse(extractedContent) as {
      extracted_words: { english: string; japanese: string }[];
      extracted_sentences: { english: string; japanese: string }[];
      source_type: string;
      notes: string;
    };

    const hasWords = extracted.extracted_words.length > 0;
    const hasSentences = extracted.extracted_sentences.length > 0;

    if (!hasWords && !hasSentences) {
      return NextResponse.json({
        extracted,
        questions: [],
        message: "画像から英語の内容を読み取れませんでした。別の画像を試してください。",
      });
    }

    // Step 2: Generate quiz
    const quizTypeDesc = {
      words: "単語問題のみ（日英・英日・穴埋め）",
      sentences: "英作文問題のみ",
      mixed: "単語問題と英作文問題を混合",
    }[quizType] || "単語問題と英作文問題を混合";

    const quizResult = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `あなたは英語学習の家庭教師です。以下の教材内容からクイズを10問作成してください。

出題形式: ${quizTypeDesc}

教材から抽出した単語:
${JSON.stringify(extracted.extracted_words)}

教材から抽出した英文:
${JSON.stringify(extracted.extracted_sentences)}

問題タイプ:
- "jp_to_en": 日本語の意味を見て英単語を答える
- "en_to_jp": 英単語を見て日本語の意味を答える
- "fill_blank": 英単語のスペル穴埋め（ヒント付き）
- "sentence": 日本語文を英訳する

必ず以下のJSON形式で回答してください:
{
  "questions": [
    { "id": 1, "type": "jp_to_en", "q": "りんご", "a": "apple" },
    ...
  ]
}

教材内容を元に出題してください。
教材の単語数が少ない場合は関連問題を作って10問にしてください。
idは1〜10の連番にしてください。`,
        },
        { role: "user", content: "教材内容からクイズを10問生成してください。" },
      ],
    });

    const quizContent = quizResult.choices[0]?.message?.content;
    if (!quizContent) throw new Error("Failed to generate quiz");

    const quiz = JSON.parse(quizContent);

    await prisma.quizSession.create({
      data: {
        studentId: session.user.id,
        unitId: unitId || null,
        type: "PHOTO_QUIZ",
        score: 0,
        total: quiz.questions?.length || 0,
      },
    });

    return NextResponse.json({
      extracted,
      questions: quiz.questions,
      message: `${extracted.source_type === "wordbook" ? "単語帳" : "教材"}から${extracted.extracted_words.length}語・${extracted.extracted_sentences.length}文を読み取り、問題を生成しました。`,
    });
  } catch (error) {
    console.error("Error in POST /api/photo-quiz:", error);
    return NextResponse.json(
      { error: "画像の処理に失敗しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
