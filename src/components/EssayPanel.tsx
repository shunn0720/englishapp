"use client";

import { useState } from "react";
import type { EssayResult } from "@/types/quiz";

interface Props {
  unitId?: string;
  unitName?: string;
}

export default function EssayPanel({ unitId, unitName }: Props) {
  const [japanese, setJapanese] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EssayResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!japanese.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ japanese: japanese.trim(), unitId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "エラーが発生しました");
      }
      const data: EssayResult = await res.json();
      setResult(data);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <h2 className="section-title">✏️ 英作文AI添削</h2>
      {unitName && <p className="section-unit-badge">{unitName}</p>}
      <p className="section-desc">
        日本語の文を入力すると、AIが正しい英文と文法解説を返します。
      </p>

      <textarea
        className="input-area"
        rows={3}
        placeholder="日本語を入力してください（例：私は昨日テレビを見ました）"
        value={japanese}
        onChange={(e) => setJapanese(e.target.value)}
        disabled={loading}
      />

      <button
        className="primary-btn"
        onClick={handleSubmit}
        disabled={loading || !japanese.trim()}
      >
        {loading ? (
          <span className="spinner-wrap">
            <span className="spinner" /> 添削中...
          </span>
        ) : (
          "AI添削する"
        )}
      </button>

      {error && <div className="error-msg">{error}</div>}

      {result && (
        <div className="result-card fade-in">
          <div className="result-block">
            <h3>正しい英文</h3>
            <p className="highlighted-text">{result.ai_answer}</p>
          </div>
          <div className="result-block">
            <h3>文法説明</h3>
            <p>{result.explanation}</p>
          </div>
          <div className="result-block">
            <h3>類題に挑戦</h3>
            <ol className="related-list">
              {result.related_questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </div>
          {saved && <div className="saved-msg">保存しました</div>}
        </div>
      )}
    </section>
  );
}
