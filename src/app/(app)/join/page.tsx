"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinClassPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleJoin = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "参加に失敗しました");
      }

      const data = await res.json();
      setSuccess(`「${data.className}」に参加しました！`);
      setTimeout(() => router.push("/"), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "参加に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <h2 className="section-title">🔗 クラスに参加</h2>
      <p className="section-desc">
        先生から受け取った招待コードを入力してクラスに参加しましょう。
      </p>

      <input
        className="auth-input"
        type="text"
        placeholder="招待コードを入力"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={loading}
      />

      <button
        className="primary-btn"
        onClick={handleJoin}
        disabled={loading || !code.trim()}
        style={{ marginTop: "12px" }}
      >
        {loading ? (
          <span className="spinner-wrap">
            <span className="spinner" /> 参加中...
          </span>
        ) : (
          "参加する"
        )}
      </button>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="saved-msg">{success}</div>}
    </section>
  );
}
