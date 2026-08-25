"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import type { GameMode, Question, RoundResult } from "@/types/question";
import { CATEGORY_ICONS, formatCountdown, pointsLabel } from "@/lib/gameLogic";

interface ResultModalProps {
  open: boolean;
  result: RoundResult | null;
  answerText: string;
  question: Question | null;
  mode: GameMode;
  dailyCountdownMs: number;
  onClose: () => void;
  onNext: () => void;
  onShare: () => void;
}

export function ResultModal({
  open,
  result,
  answerText,
  question,
  mode,
  dailyCountdownMs,
  onClose,
  onNext,
  onShare,
}: ResultModalProps) {
  const [showAllClues, setShowAllClues] = useState(false);

  useEffect(() => {
    if (open && result?.victory) {
      confetti({
        particleCount: 120,
        spread: 75,
        origin: { y: 0.62 },
        colors: ["#d8f36a", "#38bdf8", "#ff6b6b"],
      });
    }
  }, [open, result]);

  useEffect(() => {
    if (open) setShowAllClues(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [open, onClose]);

  if (!open || !result || !question) return null;

  const clues = result.unlocked;
  const victory = result.victory;
  const daily = mode === "daily";
  const emblem = CATEGORY_ICONS[question.kategorija] || "🎭";

  let matrixStr = "";
  for (let i = 1; i <= 5; i++) {
    if (i === clues && victory) matrixStr += "🟩";
    else if (i <= clues) matrixStr += "🟥";
    else matrixStr += "⬜";
  }

  const usedClues = question.tragovi.slice(0, clues);
  const remainingClues = question.tragovi.slice(clues, 5);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal modal-summary glass-panel items-center">
        <button className="modal-close" type="button" aria-label="Zatvori" onClick={onClose}>
          ×
        </button>

        <div className="result-icon">{victory ? "🎉" : "🧠"}</div>
        <span className="eyebrow">{victory ? "TAČAN ODGOVOR" : "REZULTAT"}</span>

        <div className="summary-subject">
          <span className="summary-subject-emblem" aria-hidden="true">
            {emblem}
          </span>
          <h2 id="modal-title" className="summary-subject-name">
            {answerText}
          </h2>
          <span className="summary-subject-category">{question.kategorija}</span>
        </div>

        <p className="summary-lede">
          {victory
            ? "Uspješno si odgonetnuo/la pojam."
            : "Nisi ovaj put pogodio/la, ali evo ko je bio u pitanju."}
        </p>

        <div className="result-grid">
          <div>
            <span>OSVOJENO</span>
            <strong>{pointsLabel(result.points)}</strong>
          </div>
          <div>
            <span>TRAGOVI</span>
            <strong>{clues} / 5</strong>
          </div>
        </div>

        <div className="clue-matrix" aria-label="Rezultat po tragovima">
          {matrixStr}
        </div>

        <div className="summary-clues">
          <div className="summary-clues-heading">
            <span className="eyebrow">PREGLED TRAGOVA</span>
            {remainingClues.length > 0 && (
              <button
                type="button"
                className="summary-clues-toggle"
                onClick={() => setShowAllClues((prev) => !prev)}
                aria-expanded={showAllClues}
              >
                {showAllClues ? "Sakrij zaključane" : `Pročitaj sve (${remainingClues.length})`}
              </button>
            )}
          </div>
          <ul className="summary-clue-list">
            {usedClues.map((text, index) => (
              <li key={index} className="summary-clue-item used">
                <span className="clue-badge">Trag {index + 1}</span>
                <p>{text}</p>
              </li>
            ))}
            {showAllClues &&
              remainingClues.map((text, index) => (
                <li key={clues + index} className="summary-clue-item unused">
                  <span className="clue-badge">Trag {clues + index + 1}</span>
                  <p>{text}</p>
                </li>
              ))}
          </ul>
        </div>

        {daily && (
          <div className="daily-countdown summary-countdown">
            <span className="daily-countdown-label">Novi dnevni izazov za</span>
            <strong className="daily-countdown-timer">{formatCountdown(dailyCountdownMs)}</strong>
          </div>
        )}

        <div className="modal-actions">
          <button className="button share" type="button" onClick={onShare}>
            📋 Podijeli rezultat
          </button>
          <button className="button primary" type="button" onClick={onNext}>
            {daily ? "Pređi na slobodnu igru →" : "Sljedeći pojam →"}
          </button>
        </div>
      </div>
    </div>
  );
}
