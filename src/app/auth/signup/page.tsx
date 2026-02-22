"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const teacherSecret = formData.get("teacherSecret") as string;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, teacherSecret }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "登録に失敗しました");
      }

      // Auto sign-in after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("自動ログインに失敗しました。ログインページからお試しください。");
      }

      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">新規登録</h2>

      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="name">名前</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="山田太郎"
            className="auth-input"
          />
        </div>
        <div className="auth-field">
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="example@email.com"
            className="auth-input"
          />
        </div>
        <div className="auth-field">
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="8文字以上"
            className="auth-input"
          />
        </div>
        <div className="auth-field">
          <label>アカウントの種類</label>
          <div className="role-selector">
            <label className="role-option">
              <input
                type="radio"
                name="role"
                value="STUDENT"
                checked={role === "STUDENT"}
                onChange={() => setRole("STUDENT")}
              />
              <div className="role-card">
                <span className="role-icon">🎒</span>
                <span className="role-label">生徒</span>
                <span className="role-desc">学習する</span>
              </div>
            </label>
            <label className="role-option">
              <input
                type="radio"
                name="role"
                value="TEACHER"
                checked={role === "TEACHER"}
                onChange={() => setRole("TEACHER")}
              />
              <div className="role-card">
                <span className="role-icon">👨‍🏫</span>
                <span className="role-label">先生</span>
                <span className="role-desc">クラスを管理する</span>
              </div>
            </label>
          </div>
        </div>
        {role === "TEACHER" && (
          <div className="auth-field">
            <label htmlFor="teacherSecret">先生用シークレットコード</label>
            <input
              id="teacherSecret"
              name="teacherSecret"
              type="password"
              required
              placeholder="管理者から提供されたコードを入力"
              className="auth-input"
            />
          </div>
        )}
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? (
            <span className="spinner-wrap">
              <span className="spinner" /> 登録中...
            </span>
          ) : (
            "アカウントを作成"
          )}
        </button>
      </form>

      <p className="auth-link">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/auth/signin">ログイン</Link>
      </p>
    </div>
  );
}
