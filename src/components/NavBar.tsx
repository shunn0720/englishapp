"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function NavBar() {
  const { data: session } = useSession();

  return (
    <header className="header">
      <div className="logo">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "inherit" }}>
          <span className="logo-icon">📚</span>
          <h1>English Learning AI</h1>
        </Link>
      </div>
      <div className="nav-actions">
        {session?.user && (
          <>
            <span className="nav-user">
              {session.user.name}
              <span className="nav-role-badge">
                {(session.user as { role?: string }).role === "TEACHER" ? "先生" : "生徒"}
              </span>
            </span>
            {(session.user as { role?: string }).role === "TEACHER" && (
              <Link href="/teacher" className="nav-link">
                ダッシュボード
              </Link>
            )}
            <button
              className="secondary-btn nav-btn"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            >
              ログアウト
            </button>
          </>
        )}
      </div>
    </header>
  );
}
