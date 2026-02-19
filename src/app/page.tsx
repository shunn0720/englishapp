"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type Tab = "level" | "essay" | "words" | "summary" | "photo";
type Level = "beginner" | "intermediate" | "advanced";

/* ---------- Types ---------- */
interface EssayResult {
  ai_answer: string;
  explanation: string;
  related_questions: string[];
}

interface WordQuestion {
  id: number;
  type: "jp_to_en" | "en_to_jp" | "fill_blank" | "sentence";
  q: string;
  a: string;
  hint?: string;
}

interface WordResult {
  id: number;
  correct: boolean;
  correctAnswer: string;
}

interface SummaryResult {
  summary: string;
  keywords: string[];
  reading: string;
}

interface LevelQuestion {
  id: number;
  level: string;
  type: string;
  q: string;
  a: string;
}

interface LevelResult {
  id: number;
  level: string;
  correct: boolean;
  correctAnswer: string;
}

interface PhotoExtracted {
  extracted_words: { english: string; japanese: string }[];
  extracted_sentences: { english: string; japanese: string }[];
  source_type: string;
  notes: string;
}

const LEVEL_LABELS: Record<Level, string> = {
  beginner: "🟢 初級（中学1-2年）",
  intermediate: "🟡 中級（中3〜高1）",
  advanced: "🔴 上級（高2〜大学入試）",
};

const LEVEL_COLORS: Record<Level, string> = {
  beginner: "#10b981",
  intermediate: "#f59e0b",
  advanced: "#ef4444",
};

/* ================================================================
   Main App
   ================================================================ */
export default function Home() {
  const [tab, setTab] = useState<Tab>("level");
  const [level, setLevel] = useState<Level | null>(null);

  // Persist level to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("englishapp_level");
    if (saved && ["beginner", "intermediate", "advanced"].includes(saved)) {
      setLevel(saved as Level);
      setTab("words"); // Go to main content if level already set
    }
  }, []);

  const handleLevelDetermined = (newLevel: Level) => {
    setLevel(newLevel);
    localStorage.setItem("englishapp_level", newLevel);
  };

  const resetLevel = () => {
    setLevel(null);
    localStorage.removeItem("englishapp_level");
    setTab("level");
  };

  return (
    <main className="container">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">📚</span>
          <h1>English Learning AI</h1>
        </div>
        <p className="subtitle">毎日5〜10分の英語トレーニング</p>
        {level && (
          <div className="level-badge" style={{ borderColor: LEVEL_COLORS[level] }}>
            <span>{LEVEL_LABELS[level]}</span>
            <button className="level-reset-btn" onClick={resetLevel}>
              再診断
            </button>
          </div>
        )}
      </header>

      <nav className="tab-bar">
        {!level && (
          <button
            className={`tab-btn ${tab === "level" ? "active" : ""}`}
            onClick={() => setTab("level")}
          >
            🎯 レベル診断
          </button>
        )}
        {level && (
          <>
            <button
              className={`tab-btn ${tab === "essay" ? "active" : ""}`}
              onClick={() => setTab("essay")}
            >
              ✏️ 英作文
            </button>
            <button
              className={`tab-btn ${tab === "words" ? "active" : ""}`}
              onClick={() => setTab("words")}
            >
              🔤 単語
            </button>
            <button
              className={`tab-btn ${tab === "summary" ? "active" : ""}`}
              onClick={() => setTab("summary")}
            >
              📖 長文
            </button>
            <button
              className={`tab-btn ${tab === "photo" ? "active" : ""}`}
              onClick={() => setTab("photo")}
            >
              📷 写真出題
            </button>
          </>
        )}
      </nav>

      <div className="panel">
        {tab === "level" && (
          <LevelTestPanel
            onLevelDetermined={handleLevelDetermined}
            onSkip={() => {
              handleLevelDetermined("intermediate");
              setTab("words");
            }}
          />
        )}
        {tab === "essay" && level && <EssayPanel level={level} />}
        {tab === "words" && level && <WordsPanel level={level} />}
        {tab === "summary" && <SummaryPanel />}
        {tab === "photo" && level && <PhotoQuizPanel level={level} />}
      </div>
    </main>
  );
}

/* ================================================================
   Level Test Panel
   ================================================================ */
function LevelTestPanel({
  onLevelDetermined,
  onSkip,
}: {
  onLevelDetermined: (level: Level) => void;
  onSkip: () => void;
}) {
  const [questions, setQuestions] = useState<LevelQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<LevelResult[] | null>(null);
  const [determinedLevel, setDeterminedLevel] = useState<Level | null>(null);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState("");
  const [scoreByLevel, setScoreByLevel] = useState<Record<string, { correct: number; total: number }> | null>(null);

  const startTest = async () => {
    if (loading) return;
    setLoading(true);
    setQuestions([]);
    setAnswers({});
    setResults(null);
    setDeterminedLevel(null);
    setScoreByLevel(null);
    setError("");

    try {
      const res = await fetch("/api/level-test");
      if (!res.ok) throw new Error("テスト生成に失敗しました");
      const data = await res.json();
      setQuestions(data.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const submitTest = async () => {
    if (scoring) return;
    setScoring(true);
    setError("");

    try {
      const items = questions.map((q) => ({
        id: q.id,
        level: q.level,
        question: q.q,
        studentAnswer: answers[q.id] || "",
        correctAnswer: q.a,
      }));

      const res = await fetch("/api/level-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("採点に失敗しました");
      const data = await res.json();
      setResults(data.results);
      setDeterminedLevel(data.determinedLevel);
      setScoreByLevel(data.scoreByLevel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setScoring(false);
    }
  };

  const levelLabelShort = (lvl: string) => {
    switch (lvl) {
      case "beginner": return "初級";
      case "intermediate": return "中級";
      case "advanced": return "上級";
      default: return lvl;
    }
  };

  return (
    <section className="section">
      <h2 className="section-title">🎯 レベル診断テスト</h2>
      <p className="section-desc">
        10問のテストであなたのレベルを判定します。結果に応じて問題の難易度が変わります。
      </p>

      {questions.length === 0 && !loading && (
        <div className="level-start-area">
          <button className="primary-btn" onClick={startTest}>
            診断テストを開始する
          </button>
          <button className="secondary-btn" onClick={onSkip}>
            スキップして中級から始める
          </button>
        </div>
      )}

      {loading && (
        <button className="primary-btn" disabled>
          <span className="spinner-wrap">
            <span className="spinner" /> テスト生成中...
          </span>
        </button>
      )}

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
                  <span className="quiz-type level-tag" data-level={q.level}>
                    {levelLabelShort(q.level)}
                  </span>
                </div>
                <div className="quiz-question">
                  <span>{q.q}</span>
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
                      <span className="correct-mark">⭕ 正解！</span>
                    ) : (
                      <span className="incorrect-mark">
                        ❌ 不正解 → 正解: <strong>{r.correctAnswer}</strong>
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
              onClick={submitTest}
              disabled={scoring}
            >
              {scoring ? (
                <span className="spinner-wrap">
                  <span className="spinner" /> 判定中...
                </span>
              ) : (
                "診断する"
              )}
            </button>
          )}

          {results && determinedLevel && scoreByLevel && (
            <div className="level-result-card fade-in">
              <h3 className="level-result-title">あなたのレベル</h3>
              <div
                className="level-result-badge"
                style={{ color: LEVEL_COLORS[determinedLevel] }}
              >
                {LEVEL_LABELS[determinedLevel]}
              </div>
              <div className="level-breakdown">
                {(["beginner", "intermediate", "advanced"] as const).map((lvl) => {
                  const s = scoreByLevel[lvl];
                  if (!s || s.total === 0) return null;
                  return (
                    <div key={lvl} className="level-breakdown-row">
                      <span className="level-breakdown-label">{levelLabelShort(lvl)}</span>
                      <div className="level-breakdown-bar">
                        <div
                          className="level-breakdown-fill"
                          style={{
                            width: `${(s.correct / s.total) * 100}%`,
                            backgroundColor: LEVEL_COLORS[lvl],
                          }}
                        />
                      </div>
                      <span className="level-breakdown-score">
                        {s.correct}/{s.total}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                className="primary-btn"
                style={{ marginTop: "16px" }}
                onClick={() => onLevelDetermined(determinedLevel)}
              >
                このレベルで学習を始める
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ================================================================
   Essay Panel (Level-aware)
   ================================================================ */
function EssayPanel({ level }: { level: Level }) {
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
        body: JSON.stringify({ japanese: japanese.trim(), level }),
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
            <h3>🇬🇧 正しい英文</h3>
            <p className="highlighted-text">{result.ai_answer}</p>
          </div>
          <div className="result-block">
            <h3>📝 文法説明</h3>
            <p>{result.explanation}</p>
          </div>
          <div className="result-block">
            <h3>💡 類題に挑戦</h3>
            <ol className="related-list">
              {result.related_questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </div>
          {saved && <div className="saved-msg">✅ Notionに保存しました</div>}
        </div>
      )}
    </section>
  );
}

/* ================================================================
   Words Panel (Level-aware)
   ================================================================ */
function WordsPanel({ level }: { level: Level }) {
  const [questions, setQuestions] = useState<WordQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<WordResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const generateQuiz = async () => {
    if (loading) return;
    setLoading(true);
    setQuestions([]);
    setAnswers({});
    setResults(null);
    setSaved(false);
    setError("");

    try {
      const res = await fetch(`/api/words?level=${level}`);
      if (!res.ok) throw new Error("クイズ生成に失敗しました");
      const data = await res.json();
      setQuestions(data.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswers = async () => {
    if (scoring) return;
    setScoring(true);
    setSaved(false);
    setError("");

    try {
      const items = questions.map((q) => ({
        id: q.id,
        type: q.type,
        question: q.q,
        studentAnswer: answers[q.id] || "",
        correctAnswer: q.a,
      }));

      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
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
      case "jp_to_en": return "🇯🇵→🇬🇧";
      case "en_to_jp": return "🇬🇧→🇯🇵";
      case "fill_blank": return "✏️穴埋め";
      default: return type;
    }
  };

  return (
    <section className="section">
      <h2 className="section-title">🔤 単語クイズ（10問）</h2>
      <p className="section-desc">
        {LEVEL_LABELS[level]} レベルの単語クイズです。
      </p>

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
                      <span className="correct-mark">⭕ 正解！</span>
                    ) : (
                      <span className="incorrect-mark">
                        ❌ 不正解 → 正解: <strong>{r.correctAnswer}</strong>
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
              {saved && <div className="saved-msg">✅ Notionに保存しました</div>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ================================================================
   Summary Panel (unchanged)
   ================================================================ */
function SummaryPanel() {
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
            <h3>📝 やさしい要約</h3>
            <p>{result.summary}</p>
          </div>
          <div className="result-block">
            <h3>🔑 重要単語</h3>
            <div className="keyword-list">
              {result.keywords.map((kw, i) => (
                <span key={i} className="keyword-chip">{kw}</span>
              ))}
            </div>
          </div>
          <div className="result-block">
            <h3>🗣️ カタカナ読み</h3>
            <p className="reading-text">{result.reading}</p>
          </div>
          {saved && <div className="saved-msg">✅ Notionに保存しました</div>}
        </div>
      )}
    </section>
  );
}

/* ================================================================
   Photo Quiz Panel
   ================================================================ */
function PhotoQuizPanel({ level }: { level: Level }) {
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
      formData.append("level", level);
      formData.append("quizType", "mixed");

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

  const submitAnswers = async () => {
    if (scoring) return;
    setScoring(true);

    // Client-side scoring for photo quiz
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
      case "jp_to_en": return "🇯🇵→🇬🇧";
      case "en_to_jp": return "🇬🇧→🇯🇵";
      case "fill_blank": return "✏️穴埋め";
      case "sentence": return "📝英作文";
      default: return type;
    }
  };

  return (
    <section className="section">
      <h2 className="section-title">📷 写真から出題</h2>
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
          📖 画像を読み取って出題する
        </button>
      )}

      {extracting && (
        <button className="primary-btn" disabled>
          <span className="spinner-wrap">
            <span className="spinner" /> 画像を読み取り中...（少し時間がかかります）
          </span>
        </button>
      )}

      {error && <div className="error-msg">{error}</div>}
      {message && !error && (
        <div className="info-msg">{message}</div>
      )}

      {extracted && (
        <div className="extracted-info fade-in">
          <h3>📋 読み取った内容</h3>
          <div className="extracted-stats">
            <span className="keyword-chip">単語: {extracted.extracted_words.length}語</span>
            <span className="keyword-chip">英文: {extracted.extracted_sentences.length}文</span>
            <span className="keyword-chip">種類: {extracted.source_type}</span>
          </div>
          {extracted.notes && (
            <p className="extracted-notes">{extracted.notes}</p>
          )}
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
                      <span className="correct-mark">⭕ 正解！</span>
                    ) : (
                      <span className="incorrect-mark">
                        ❌ 不正解 → 正解: <strong>{r.correctAnswer}</strong>
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
