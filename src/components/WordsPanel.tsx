"use client";

import { useState } from "react";
import type { WordResult } from "@/types/quiz";

interface QuestionDisplay {
  id: number;
  type: "jp_to_en" | "en_to_jp" | "fill_blank";
  q: string;
  hint?: string;
}

interface Props {
  unitId?: string;
  unitName?: string;
}

export default function WordsPanel({ unitId, unitName }: Props) {
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionDisplay[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<WordResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const generateQuiz = async () => {
    if (loading) return;
    setLoading(true);
    setQuizId(null);
    setQuestions([]);
    setAnswers({});
    setResults(null);
    setSaved(false);
    setError("");

    try {
      const params = new URLSearchParams();
      if (unitId) params.set("unitId", unitId);
      const res = await fetch(`/api/words?${params.toString()}`);
      if (!res.ok) throw new Error("クイズ生成に失敗しました");
      const data = await res.json();
      setQuizId(data.quizId);
      setQuestions(data.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswers = async () => {
    if (scoring || !quizId) return;
    setScoring(true);
    setSaved(false);
    setError("");

    try {
      const items = questions.map((q) => ({
        id: q.id,
        studentAnswer: answers[q.id] || "",
      }));

      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, items }),
      });
      if (!res.ok) throw new Error("採点に失敗しました");
      const data = await res.json();
      setResults(data.results);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setScoring(false);
    }
  };

  const correctCount = results ? results.filter((r) => r.correct).length : 0;

  const typeLabel = (type: string) => {
    switch (type) {
      case "jp_to_en": return "日→英";
      case "en_to_jp": return "英→日";
      case "fill_blank": return "穴埋め";
      default: return type;
    }
  };

  return (
    <section className="section">
      <h2 className="section-title">🔤 単語クイズ（10問）</h2>
      {unitName && <p className="section-unit-badge">{unitName}</p>}

      <button className="primary-btn" onClick={generateQuiz} disabled={loading}>
        {loading ? (
          <span className="spinner-wrap">
            <span className="spinner" /> 生成中...
          </span>
        ) : (
          "10問を生成する"
        )}
      </button>

      {error && <div className="error-msg">{error}</div>}

      {questions.length > 0 && (
        <div className="quiz-container fade-in">
          {questions.map((q) => {
            const r = results?.find((res) => res.id === q.id);
            return (
              <div
                key={q.id}
                className={`quiz-row ${r ? (r.correct ? "correct-row" : "incorrect-row") : ""}`}
              >
                <div className="quiz-header">
                  <span className="quiz-number">Q{q.id}</span>
                  <span className="quiz-type">{typeLabel(q.type)}</span>
                </div>
                <div className="quiz-question">
                  <span>{q.q}</span>
                  {q.hint && <span className="quiz-hint">ヒント: {q.hint}</span>}
                </div>
                <input
                  className="quiz-input"
                  type="text"
                  placeholder="答えを入力"
                  value={answers[q.id] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  disabled={results !== null}
                />
                {r && (
                  <div className="quiz-feedback">
                    {r.correct ? (
                      <span className="correct-mark">正解！</span>
                    ) : (
                      <span className="incorrect-mark">
                        不正解 → 正解: <strong>{r.correctAnswer}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!results && (
            <button
              className="primary-btn score-btn"
              onClick={submitAnswers}
              disabled={scoring}
            >
              {scoring ? (
                <span className="spinner-wrap">
                  <span className="spinner" /> 採点中...
                </span>
              ) : (
                "採点する"
              )}
            </button>
          )}

          {results && (
            <div className="score-result fade-in">
              <div className="score-display">
                <span className="score-number">{correctCount}</span>
                <span className="score-total">/ {results.length}</span>
              </div>
              <p className="score-label">正解</p>
              {saved && <div className="saved-msg">保存しました</div>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
