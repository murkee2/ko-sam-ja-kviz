"use client";

import { useEffect, useRef, useState } from "react";
import type { GameMode } from "@/types/question";

interface ScoreStripProps {
  mode: GameMode;
  points: number;
  streak: number;
  total: number;
}

function usePopOnChange(value: number) {
  const [pop, setPop] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setPop(false);
      // Restart animation on next frame
      const id = requestAnimationFrame(() => setPop(true));
      return () => cancelAnimationFrame(id);
    }
  }, [value]);

  return pop;
}

export function ScoreStrip({ mode, points, streak, total }: ScoreStripProps) {
  const streakPop = usePopOnChange(streak);
  const totalPop = usePopOnChange(total);

  return (
    <section className="score-strip glass-panel" aria-label="Statistika igre">
      <div className="score-item">
        <span className="score-icon">🎮</span>
        <span className="score-body">
          <span className="score-label">MOD</span>
          <strong>{mode === "daily" ? "Dnevni izazov" : "Slobodna igra"}</strong>
        </span>
      </div>
      <div className="score-item">
        <span className="score-icon">⭐</span>
        <span className="score-body">
          <span className="score-label">VRIJEDI</span>
          <strong className="gold">{points}</strong>
        </span>
      </div>
      <div className="score-item">
        <span className="score-icon">🔥</span>
        <span className="score-body">
          <span className="score-label">STREAK</span>
          <strong className={streakPop ? "value-pop" : ""}>{streak}</strong>
        </span>
      </div>
      <div className="score-item">
        <span className="score-icon">🏆</span>
        <span className="score-body">
          <span className="score-label">UKUPNO</span>
          <strong className={totalPop ? "value-pop" : ""}>{total}</strong>
        </span>
      </div>
    </section>
  );
}
