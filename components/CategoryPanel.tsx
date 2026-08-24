"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/gameLogic";

interface CategoryPanelProps {
  visible: boolean;
  category: string;
  difficulty: string;
  onCategoryChange: (category: string) => void;
  onDifficultyChange: (difficulty: string) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  Sve: "✨",
  Sport: "⚽",
  Geografija: "🌍",
  Historija: "🏛️",
  "Film i muzika": "🎬",
  Tehnologija: "💻",
  Nauka: "🔬",
  "Književnost i umjetnost": "📖",
};

const DIFFICULTIES: { value: string; label: string }[] = [
  { value: "sve", label: "✨ Sve" },
  { value: "easy", label: "🟢 Lako" },
  { value: "medium", label: "🟡 Srednje" },
  { value: "hard", label: "🔴 Teško" },
];

const DIFFICULTY_LABELS: Record<string, string> = {
  sve: "✨ Sve",
  easy: "🟢 Lako",
  medium: "🟡 Srednje",
  hard: "🔴 Teško",
};

export function CategoryPanel({
  visible,
  category,
  difficulty,
  onCategoryChange,
  onDifficultyChange,
}: CategoryPanelProps) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [difficultyOpen, setDifficultyOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!pulse) return;
    const timer = setTimeout(() => setPulse(false), 400);
    return () => clearTimeout(timer);
  }, [pulse]);

  if (!visible) return null;

  const handleCategoryClick = (value: string) => {
    setCategoryOpen(false);
    if (value === category) return;
    onCategoryChange(value);
    setPulse(true);
  };

  const handleDifficultyClick = (value: string) => {
    setDifficultyOpen(false);
    if (value === difficulty) return;
    onDifficultyChange(value);
  };

  return (
    <section className={`category-panel glass-panel${pulse ? " filter-pulse" : ""}`} aria-label="Filter kategorija i težine">
      <div className="filter-row">
        <div className="filter-col">
          <button
            className={`section-heading category-toggle${categoryOpen ? " open" : ""}`}
            type="button"
            aria-expanded={categoryOpen}
            aria-controls="category-list-wrap"
            onClick={() => {
              setCategoryOpen((prev) => !prev);
              setDifficultyOpen(false);
            }}
          >
            <div>
              <span className="eyebrow">TEMATSKI FILTER</span>
              <h2>Kategorije</h2>
            </div>
            <span className="category-toggle-right">
              <span className="category-badge" data-category={category}>
                {CATEGORY_EMOJI[category]} {category}
              </span>
              <span className="category-toggle-arrow" aria-hidden="true">
                ▾
              </span>
            </span>
          </button>
          <div id="category-list-wrap" className={`category-list-wrap${categoryOpen ? " open" : ""}`}>
            <div className="category-list">
              {CATEGORIES.filter((cat) => cat !== category).map((cat) => (
                <button
                  key={cat}
                  className="category-button"
                  data-category={cat}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                >
                  {CATEGORY_EMOJI[cat]} {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="filter-col">
          <button
            className={`section-heading difficulty-toggle${difficultyOpen ? " open" : ""}`}
            type="button"
            aria-expanded={difficultyOpen}
            aria-controls="difficulty-list-wrap"
            onClick={() => {
              setDifficultyOpen((prev) => !prev);
              setCategoryOpen(false);
            }}
          >
            <div>
              <span className="eyebrow">TEŽINA</span>
              <h2>Težina pitanja</h2>
            </div>
            <span className="category-toggle-right">
              <span className="category-badge" data-difficulty={difficulty}>
                {DIFFICULTY_LABELS[difficulty]}
              </span>
              <span className="category-toggle-arrow" aria-hidden="true">
                ▾
              </span>
            </span>
          </button>
          <div id="difficulty-list-wrap" className={`difficulty-list-wrap${difficultyOpen ? " open" : ""}`}>
            <div className="difficulty-list" role="group" aria-label="Odabir težine">
              {DIFFICULTIES.filter((d) => d.value !== difficulty).map((d) => (
                <button
                  key={d.value}
                  className="difficulty-button"
                  data-difficulty={d.value}
                  type="button"
                  onClick={() => handleDifficultyClick(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
