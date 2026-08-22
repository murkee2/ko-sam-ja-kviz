"use client";

import { useEffect, useState } from "react";
import type { Question } from "@/types/question";
import { useQuizGame } from "@/lib/useQuizGame";
import { buildResultText, copyToClipboard } from "@/lib/shareResult";
import { Header } from "@/components/Header";
import { ScoreStrip } from "@/components/ScoreStrip";
import { CategoryPanel } from "@/components/CategoryPanel";
import { GameCard } from "@/components/GameCard";
import { ResultModal } from "@/components/ResultModal";
import { RulesModal } from "@/components/RulesModal";
import { Toast } from "@/components/Toast";

export default function HomePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/data/questions.json");
        if (!response.ok) throw new Error("Pitanja nisu dostupna.");
        const data: Question[] = await response.json();
        if (!data.length) throw new Error("Baza pitanja je prazna.");
        if (!cancelled) setQuestions(data);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLoadError("Nije moguće učitati pitanja. Pokušaj ponovo kasnije.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { state, actions } = useQuizGame(questions);

  const handleShare = async () => {
    const text = buildResultText(state.result, state.mode, state.streak, state.unlocked);
    await copyToClipboard(text);
    actions.showToast("📋 Rezultat je kopiran u međuspremnik!");
  };

  return (
    <>
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <div className="app-shell">
        <Header
          mode={state.mode}
          muted={state.muted}
          onModeChange={actions.toggleMode}
          onToggleMuted={actions.toggleMuted}
          onOpenRules={actions.openRules}
        />

        <ScoreStrip mode={state.mode} points={state.points} streak={state.streak} total={state.total} />

        <CategoryPanel
          visible={state.mode === "free"}
          category={state.category}
          difficulty={state.difficulty}
          onCategoryChange={actions.changeCategory}
          onDifficultyChange={actions.changeDifficulty}
        />

        {loadError && <p className="feedback error">{loadError}</p>}

        {!loadError && state.question && (
          <GameCard
            question={state.question}
            unlocked={state.unlocked}
            points={state.points}
            questionNumber={state.questionNumber}
            result={state.result}
            feedback={state.feedback}
            solved={state.solved}
            dailyCountdownActive={state.dailyCountdownActive}
            savedDailyResult={state.savedDailyResult}
            dailyCountdownMs={state.dailyCountdownMs}
            onSubmitGuess={actions.submitGuess}
            onRevealClue={actions.revealNextClue}
            onSkip={actions.skipQuestion}
          />
        )}

        <footer>
          <span>Svaki trag otvara novu perspektivu.</span>
          <span>© Ko sam ja? • Bosanski kviz</span>
        </footer>
      </div>

      <ResultModal
        open={state.modalOpen}
        result={state.result}
        answerText={state.answerText}
        mode={state.mode}
        onClose={actions.closeModal}
        onNext={actions.nextFreeQuestion}
        onShare={handleShare}
      />

      <RulesModal open={state.rulesOpen} onClose={actions.closeRules} />

      <Toast message={state.toast} />
    </>
  );
}
