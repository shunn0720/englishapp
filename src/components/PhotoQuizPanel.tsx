"use client";

import { useState, useRef, useCallback } from "react";
import type { WordQuestion, WordResult, PhotoExtracted } from "@/types/quiz";

interface Props {
  unitId?: string;
  unitName?: string;
}

export default function PhotoQuizPanel({ unitId, unitName }: Props) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<PhotoExtracted | null>(null);
  const [questions, setQuestions] = useState<WordQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<WordResult[] | null>(null);
  const [scoring, setScoring] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setExtracted(null);
    setQuestions([]);
    setAnswers({});
    setResults(null);
    setMessage("");
    setError("");

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleUpload = async () => {
    if (!imageFile || extracting) return;
    setExtracting(true);
    setError("");
    setExtracted(null);
    setQuestions([]);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("quizType", "mixed");
      if (unitId) formData.append("unitId", unitId);

      const res = await fetch("/api/photo-quiz", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "画像処理に失敗しました");
      }
      const data = await res.json();
      setExtracted(data.extracted);
      setQuestions(data.questions || []);
      setMessage(data.message || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setExtracting(false);
    }
  };

  const submitAnswers = () => {
    if (scoring) return;
    setScoring(true);

    const normalize = (s: string) =>
      s.trim().toLowerCase().replace(/^to\s+/, "");

    const scored: WordResult[] = questions.map((q) => ({
      id: q.id,
      correct: normalize(answers[q.id] || "") === normalize(q.a),
      correctAnswer: q.a,
    }));
    setResults(scored);
    setScoring(false);
  };

  const correctCount = results ? results.filter((r) => r.correct).length : 0;

  const typeLabel = (type: string) => {
    switch (type) {
      case "jp_to_en": return "日→英";
      case "en_to_jp": return "英→日";
      case "fill_blank": return "穴埋め";
      case "sentence": return "英作文";
      default: return type;
    }
  };

  return (
    <section className="section">
      <h2 className="section-title">📷 写真から出題</h2>
      {unitName && <p className="section-unit-badge">{unitName}</p>}
      <p className="section-desc">
        単語帳や教科書の写真をアップロードすると、AIが内容を読み取って問題を作ります。
      </p>

      <div className="photo-upload-area" onClick={() => fileInputRef.current?.click()}>
        {imagePreview ? (
          <img src={imagePreview} alt="Preview" className="photo-preview" />
        ) : (
          <div className="photo-placeholder">
            <span className="photo-placeholder-icon">📸</span>
            <span>写真をタップして選択</span>
            <span className="photo-placeholder-sub">
              JPEG, PNG, WebP対応 / 10MBまで
            </span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>

      {imageFile && !extracting && questions.length === 0 && (
        <button className="primary-btn" onClick={handleUpload}>
          画像を読み取って出題する
        </button>
      )}

      {extracting && (
        <button className="primary-btn" disabled>
          <span className="spinner-wrap">
            <span className="spinner" /> 画像を読み取り中...
          </span>
        </button>
      )}

      {error && <div className="error-msg">{error}</div>}
      {message && !error && <div className="info-msg">{message}</div>}

      {extracted && (
        <div className="extracted-info fade-in">
          <h3>読み取った内容</h3>
          <div className="extracted-stats">
            <span className="keyword-chip">単語: {extracted.extracted_words.length}語</span>
            <span className="keyword-chip">英文: {extracted.extracted_sentences.length}文</span>
            <span className="keyword-chip">種類: {extracted.source_type}</span>
          </div>
          {extracted.notes && <p className="extracted-notes">{extracted.notes}</p>}
        </div>
      )}

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
            <button className="primary-btn score-btn" onClick={submitAnswers} disabled={scoring}>
              採点する
            </button>
          )}

          {results && (
            <div className="score-result fade-in">
              <div className="score-display">
                <span className="score-number">{correctCount}</span>
                <span className="score-total">/ {results.length}</span>
              </div>
              <p className="score-label">正解</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
