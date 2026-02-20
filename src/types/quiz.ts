export type QuizType = "words" | "essay" | "summary" | "photo" | "level";

export interface WordQuestion {
  id: number;
  type: "jp_to_en" | "en_to_jp" | "fill_blank" | "sentence";
  q: string;
  a: string;
  hint?: string;
}

export interface WordResult {
  id: number;
  correct: boolean;
  correctAnswer: string;
}

export interface LevelQuestion {
  id: number;
  level: "beginner" | "intermediate" | "advanced";
  type: "jp_to_en" | "en_to_jp" | "fill_blank" | "grammar";
  q: string;
  a: string;
  choices?: string[];
}

export interface LevelResult {
  id: number;
  level: string;
  correct: boolean;
  correctAnswer: string;
}

export interface EssayResult {
  ai_answer: string;
  explanation: string;
  related_questions: string[];
}

export interface SummaryResult {
  summary: string;
  keywords: string[];
  reading: string;
}

export interface PhotoExtracted {
  extracted_words: { english: string; japanese: string }[];
  extracted_sentences: { english: string; japanese: string }[];
  source_type: string;
  notes: string;
}

export interface UnitInfo {
  id: string;
  name: string;
  nameEn: string;
  order: number;
  grade: string;
  lastScore?: number;
  lastTotal?: number;
}
