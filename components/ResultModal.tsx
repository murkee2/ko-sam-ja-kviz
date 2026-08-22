"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import type { GameMode, RoundResult } from "@/types/question";
import { pointsLabel } from "@/lib/gameLogic";

interface ResultModalProps {
  open: boolean;
  result: RoundResult | null;
  answerText: string;
  mode: GameMode;
  onClose: () => void;
  onNext: () => void;
  onShare: () => void;
}

export function ResultModal({ open, result, answerText, mode, onClose, onNext, onShare }: ResultModalProps) {
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
    if (!open) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [open, onClose]);

  if (!open || !result) return null;

  const clues = result.unlocked;
  const victory = result.victory;
  const daily = mode === "daily";

  let matrixStr = "";
  for (let i = 1; i <= 5; i++) {
    if (i === clues && victory) matrixStr += "🟩";
    else if (i <= clues) matrixStr += "🟥";
    else matrixStr += "⬜";
  }

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
      <div className="modal glass-panel">
        <button className="modal-close" type="button" aria-label="Zatvori" onClick={onClose}>
          ×
        </button>
        <div className="result-icon">{victory ? "🎉" : "🧠"}</div>
        <span className="eyebrow">REZULTAT</span>
        <h2 id="modal-title">{victory ? "Svaka čast!" : "Dobar pokušaj!"}</h2>
        <p>
          {victory
            ? "Uspješno si odgonetnuo/la pojam."
            : "Tačan odgovor je prikazan ispod. Sljedeći put ide još bolje!"}
        </p>

        <div className="answer-reveal">
          <span>TAČAN ODGOVOR</span>
          <strong>{answerText}</strong>
        </div>

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
        {daily && <p className="daily-message">Novi dnevni izazov stiže sutra!</p>}

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
