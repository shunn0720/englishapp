"use client";

import { useState } from "react";
import type { SummaryResult } from "@/types/quiz";

export default function SummaryPanel() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) throw new Error("要約に失敗しました");
      const data: SummaryResult = await res.json();
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
      <h2 className="section-title">📖 長文の要約</h2>
      <p className="section-desc">
        英文を貼り付けると、やさしい日本語要約・重要単語・カタカナ読みを返します。
      </p>

      <textarea
        className="input-area"
        rows={6}
        placeholder="英文を貼り付けてください"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={loading}
      />

      <button
        className="primary-btn"
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
      >
        {loading ? (
          <span className="spinner-wrap">
            <span className="spinner" /> 要約中...
          </span>
        ) : (
          "要約する"
        )}
      </button>

      {error && <div className="error-msg">{error}</div>}

      {result && (
        <div className="result-card fade-in">
          <div className="result-block">
            <h3>やさしい要約</h3>
            <p>{result.summary}</p>
          </div>
          <div className="result-block">
            <h3>重要単語</h3>
            <div className="keyword-list">
              {result.keywords.map((kw, i) => (
                <span key={i} className="keyword-chip">{kw}</span>
              ))}
            </div>
          </div>
          <div className="result-block">
            <h3>カタカナ読み</h3>
            <p className="reading-text">{result.reading}</p>
          </div>
          {saved && <div className="saved-msg">保存しました</div>}
        </div>
      )}
    </section>
  );
}
