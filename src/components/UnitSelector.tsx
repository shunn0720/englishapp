"use client";

import { useRouter } from "next/navigation";
import type { UnitInfo } from "@/types/quiz";

const GRADE_COLORS: Record<string, string> = {
  "中1": "#10b981",
  "中2": "#f59e0b",
  "中3": "#ef4444",
  "高1": "#8b5cf6",
  "高2": "#ec4899",
};

export default function UnitSelector({ units }: { units: UnitInfo[] }) {
  const router = useRouter();

  const grades = [...new Set(units.map((u) => u.grade))];

  const handleSelect = (unitId: string, quizType: string) => {
    router.push(`/quiz/${quizType}?unitId=${unitId}`);
  };

  return (
    <section className="section">
      <h2 className="section-title">📚 単元を選んで学習</h2>
      <p className="section-desc">
        学習したい単元を選んでください。単語・英作文・写真出題が使えます。
      </p>

      {grades.map((grade) => (
        <div key={grade} className="unit-grade-group">
          <h3 className="unit-grade-title" style={{ color: GRADE_COLORS[grade] || "#94a3b8" }}>
            {grade}
          </h3>
          <div className="unit-grid">
            {units
              .filter((u) => u.grade === grade)
              .map((unit) => (
                <div key={unit.id} className="unit-card">
                  <div className="unit-card-header">
                    <span className="unit-name">{unit.name}</span>
                    <span className="unit-name-en">{unit.nameEn}</span>
                  </div>
                  {unit.lastScore !== undefined && (
                    <div className="unit-score">
                      前回: {unit.lastScore}/{unit.lastTotal}
                    </div>
                  )}
                  <div className="unit-actions">
                    <button
                      className="unit-action-btn"
                      onClick={() => handleSelect(unit.id, "words")}
                    >
                      🔤 単語
                    </button>
                    <button
                      className="unit-action-btn"
                      onClick={() => handleSelect(unit.id, "essay")}
                    >
                      ✏️ 英作文
                    </button>
                    <button
                      className="unit-action-btn"
                      onClick={() => handleSelect(unit.id, "photo")}
                    >
                      📷 写真
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}
