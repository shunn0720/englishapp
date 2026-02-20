"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateClassForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "クラスの作成に失敗しました");
      }

      setName("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "クラスの作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-class-form">
      <h3 className="subsection-title">新しいクラスを作成</h3>
      <div className="create-class-row">
        <input
          className="auth-input"
          type="text"
          placeholder="クラス名（例：中2A英語）"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
        <button
          className="primary-btn"
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          style={{ whiteSpace: "nowrap" }}
        >
          {loading ? "作成中..." : "作成"}
        </button>
      </div>
      {error && <div className="error-msg">{error}</div>}
    </div>
  );
}
