"use client";

import { useEffect, useRef, useState } from "react";
import type { DailyStorageResult, Question, RoundResult } from "@/types/question";
import { CATEGORY_ICONS, DIFFICULTY_LABELS, decodeBase64, formatCountdown, pointsLabel } from "@/lib/gameLogic";
import type { Feedback } from "@/lib/useQuizGame";

interface GameCardProps {
  question: Question | null;
  unlocked: number;
  points: number;
  questionNumber: number;
  result: RoundResult | null;
  feedback: Feedback | null;
  solved: boolean;
  dailyCountdownActive: boolean;
  savedDailyResult: DailyStorageResult | null;
  dailyCountdownMs: number;
  onSubmitGuess: (guess: string) => { correct: boolean };
  onRevealClue: () => void;
  onSkip: () => void;
}

export function GameCard({
  question,
  unlocked,
  points,
  questionNumber,
  result,
  feedback,
  solved,
  dailyCountdownActive,
  savedDailyResult,
  dailyCountdownMs,
  onSubmitGuess,
  onRevealClue,
  onSkip,
}: GameCardProps) {
  const [inputValue, setInputValue] = useState("");
  const [shake, setShake] = useState(false);
  const [cardTransition, setCardTransition] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cluesRef = useRef<HTMLDivElement>(null);
  const prevQuestionId = useRef<number | null>(null);

  useEffect(() => {
    if (!question) return;
    if (prevQuestionId.current !== question.id) {
      prevQuestionId.current = question.id;
      setInputValue("");
      setCardTransition(false);
      requestAnimationFrame(() => setCardTransition(true));
      if (typeof window !== "undefined" && window.innerWidth > 768 && !dailyCountdownActive) {
        inputRef.current?.focus();
      }
    }
  }, [question, dailyCountdownActive]);

  if (!question) return null;

  const controlsEnabled = !result;
  const clueEmblem = CATEGORY_ICONS[question.kategorija] || "🎭";
  const difficultyLabel = DIFFICULTY_LABELS[question.tezina];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (result) return;
    const { correct } = onSubmitGuess(inputValue);
    if (!correct) {
      setShake(false);
      requestAnimationFrame(() => setShake(true));
      inputRef.current?.select();
    }
  };

  return (
    <main className={`game-card glass-panel${cardTransition ? " card-transition" : ""}`} data-category={question.kategorija}>
      <div className="category-emblem" aria-hidden="true">
        {clueEmblem}
      </div>
      <div className="game-heading">
        <div>
          <span className="eyebrow">
            PITANJE <span>{String(questionNumber).padStart(2, "0")}</span>
          </span>
          <h1>{question.kategorija || "Ko sam ja?"}</h1>
          {difficultyLabel && (
            <span className="difficulty-badge" data-difficulty={question.tezina}>
              {difficultyLabel}
            </span>
          )}
        </div>
        <div className="clue-counter">
          <strong>{unlocked} / 5</strong>
          <span>tragova otključano</span>
        </div>
      </div>

      <div className="clues" aria-live="polite" ref={cluesRef}>
        {question.tragovi.slice(0, 5).map((clueText, index) => {
          const clueNumber = index + 1;
          const clueUnlocked = clueNumber <= unlocked;
          const clueSolved = solved && clueUnlocked;
          const pointsForThis = 6 - clueNumber;
          return (
            <article
              key={clueNumber}
              className={`clue ${clueUnlocked ? "unlocked" : "locked"}${clueSolved ? " solved" : ""}`}
            >
              <span className="clue-badge">
                Trag {clueNumber} ({pointsForThis} b.)
              </span>
              <p className="clue-text">{clueUnlocked ? clueText : "Ovaj trag je zaključan."}</p>
              <span className="clue-status">{clueUnlocked ? "🔓" : "🔒"}</span>
            </article>
          );
        })}
      </div>

      {!dailyCountdownActive && (
        <div className="answer-area">
          <form className="guess-form" autoComplete="off" onSubmit={handleSubmit}>
            <label htmlFor="guess-input" className="sr-only">
              Tvoj odgovor
            </label>
            <div className={`input-row${shake ? " shake" : ""}`} onAnimationEnd={() => setShake(false)}>
              <input
                id="guess-input"
                ref={inputRef}
                type="text"
                placeholder="Upiši ime, grad ili pojam..."
                aria-describedby="feedback-msg"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                enterKeyHint="go"
                disabled={!controlsEnabled}
                className={solved ? "solved" : ""}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button className="button primary" type="submit" disabled={!controlsEnabled}>
                Pogodi <span>→</span>
              </button>
            </div>
          </form>

          {feedback && (
            <div id="feedback-msg" className={`feedback ${feedback.type}`} role="status">
              {feedback.message}
            </div>
          )}

          <div className="secondary-actions">
            <button
              className="button secondary"
              type="button"
              disabled={unlocked >= 5 || !controlsEnabled}
              onClick={onRevealClue}
            >
              🔍 Otkrij sljedeći trag <em>(-1 bod)</em>
            </button>
            <button className="button skip" type="button" onClick={onSkip}>
              ⏭️ Preskoči
            </button>
          </div>
        </div>
      )}

      {dailyCountdownActive && savedDailyResult && (
        <div className="answer-area">
          <div className="daily-countdown">
            <p className={`daily-countdown-result ${savedDailyResult.victory ? "victory" : "defeat"}`}>
              {savedDailyResult.victory
                ? `🎉 Tačno! Osvojio/la si ${pointsLabel(savedDailyResult.points)}.`
                : `🧠 Netačno. Odgovor: ${decodeBase64(question.odgovorEnc)}`}
            </p>
            <span className="daily-countdown-label">Sljedeći dnevni izazov za</span>
            <strong className="daily-countdown-timer">{formatCountdown(dailyCountdownMs)}</strong>
          </div>
        </div>
      )}
    </main>
  );
}
