"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DailyStorageResult, GameMode, Question, RoundResult } from "@/types/question";
import {
  decodeBase64,
  getDailyQuestion,
  getDailyStorageKey,
  isCorrectGuess,
} from "@/lib/gameLogic";
import { useSound } from "@/lib/useSound";

function readLocalStorage(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

function readDailyResult(): DailyStorageResult | null {
  try {
    return JSON.parse(localStorage.getItem(getDailyStorageKey()) || "null");
  } catch {
    return null;
  }
}

export interface Feedback {
  message: string;
  type: "info" | "error";
}

export function useQuizGame(questions: Question[]) {
  const [mode, setMode] = useState<GameMode>("daily");
  const [category, setCategory] = useState("Sve");
  const [difficulty, setDifficulty] = useState("sve");
  const [question, setQuestion] = useState<Question | null>(null);
  const [unlocked, setUnlocked] = useState(1);
  const [points, setPoints] = useState(5);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [solved, setSolved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [dailyCountdownActive, setDailyCountdownActive] = useState(false);
  const [savedDailyResult, setSavedDailyResult] = useState<DailyStorageResult | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const freeOrderRef = useRef<Question[]>([]);
  const freePositionRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const sound = useSound(muted);

  // Hydrate persisted state on mount (client-only)
  useEffect(() => {
    setTotal(Number.parseInt(readLocalStorage("ko_sam_ja_total_score", "0"), 10));
    setStreak(Number.parseInt(readLocalStorage("ko_sam_ja_streak", "0"), 10));
    setMuted(readLocalStorage("ko_sam_ja_muted", "false") === "true");
    setHydrated(true);
  }, []);

  const saveStats = useCallback((nextTotal: number, nextStreak: number) => {
    localStorage.setItem("ko_sam_ja_total_score", String(nextTotal));
    localStorage.setItem("ko_sam_ja_streak", String(nextStreak));
  }, []);

  const resetQuestion = useCallback((nextQuestion: Question, number = 1) => {
    setQuestion(nextQuestion);
    setUnlocked(1);
    setPoints(5);
    setQuestionNumber(number);
    setResult(null);
    setFeedback(null);
    setSolved(false);
  }, []);

  const startDaily = useCallback(() => {
    if (!questions.length) return;
    setMode("daily");
    setDailyCountdownActive(false);
    const { question: dailyQuestion } = getDailyQuestion(questions);
    const saved = readDailyResult();
    resetQuestion(dailyQuestion, 1);

    if (saved?.completed) {
      setUnlocked(saved.unlocked || 5);
      setPoints(saved.points || 0);
      setResult(saved);
      setSavedDailyResult(saved);
      setDailyCountdownActive(true);
    } else {
      setSavedDailyResult(null);
    }
  }, [questions, resetQuestion]);

  const showToast = useCallback((message: string) => {
    clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const startFree = useCallback(
    (options: { skipEmptyToast?: boolean } = {}) => {
      if (!questions.length) return;
      setMode("free");
      setDailyCountdownActive(false);

      let pool = category === "Sve" ? questions : questions.filter((q) => q.kategorija === category);
      if (difficulty !== "sve") {
        pool = pool.filter((q) => q.tezina === difficulty);
      }

      if (!pool.length) {
        if (!options.skipEmptyToast) showToast("Nema pitanja za odabranu kategoriju i težinu.");
        return;
      }

      if (freeOrderRef.current.length === 0 || freePositionRef.current >= freeOrderRef.current.length) {
        freeOrderRef.current = [...pool].sort(() => Math.random() - 0.5);
        freePositionRef.current = 0;
      }

      const nextQuestion = freeOrderRef.current[freePositionRef.current++];
      resetQuestion(nextQuestion, freePositionRef.current);
    },
    [questions, category, difficulty, resetQuestion, showToast]
  );

  // Initial load
  useEffect(() => {
    if (questions.length && hydrated) {
      startDaily();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, hydrated]);

  // Daily countdown ticking
  useEffect(() => {
    if (!dailyCountdownActive) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [dailyCountdownActive]);

  useEffect(() => {
    if (!dailyCountdownActive) return;
    const remaining = 86400000 - (now % 86400000);
    if (remaining <= 1000 && mode === "daily") {
      startDaily();
    }
  }, [now, dailyCountdownActive, mode, startDaily]);

  const revealNextClue = useCallback(() => {
    if (unlocked >= 5 || result) return;
    const nextUnlocked = unlocked + 1;
    setUnlocked(nextUnlocked);
    const nextPoints = Math.max(1, 6 - nextUnlocked);
    setPoints(nextPoints);
    sound.unlock();
    setFeedback({
      message: `Trag ${nextUnlocked} otključan. Sada pojam vrijedi ${
        nextPoints === 1 ? "1 bod" : nextPoints < 5 ? `${nextPoints} boda` : `${nextPoints} bodova`
      }.`,
      type: "info",
    });
  }, [unlocked, result, sound]);

  const submitGuess = useCallback(
    (guess: string) => {
      if (result || !question) return { correct: false };
      sound.start();

      if (isCorrectGuess(guess, question)) {
        sound.success();
        const roundResult: RoundResult = { victory: true, points, unlocked };
        const nextTotal = total + points;
        const nextStreak = streak + 1;
        setResult(roundResult);
        setTotal(nextTotal);
        setStreak(nextStreak);
        saveStats(nextTotal, nextStreak);
        setSolved(true);

        if (mode === "daily") {
          const saved: DailyStorageResult = { completed: true, ...roundResult };
          localStorage.setItem(getDailyStorageKey(), JSON.stringify(saved));
        }

        setModalOpen(true);
        return { correct: true };
      }

      sound.wrong();
      setFeedback({ message: "Nije tačno. Pokušaj ponovo ili otključaj sljedeći trag.", type: "error" });
      return { correct: false };
    },
    [result, question, points, unlocked, total, streak, mode, sound, saveStats]
  );

  const skipQuestion = useCallback(() => {
    if (result) {
      // Pitanje je već riješeno/preskočeno — Preskoči sad učitava novo pitanje.
      if (mode === "daily") {
        setMode("free");
      }
      startFree();
      return;
    }
    const roundResult: RoundResult = { victory: false, points: 0, unlocked };
    setResult(roundResult);
    setStreak(0);
    saveStats(total, 0);

    if (mode === "daily") {
      const saved: DailyStorageResult = { completed: true, ...roundResult };
      localStorage.setItem(getDailyStorageKey(), JSON.stringify(saved));
    }

    setModalOpen(true);
  }, [result, mode, unlocked, total, saveStats, startFree]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    if (result && mode === "daily") {
      setSavedDailyResult({ completed: true, ...result });
      setDailyCountdownActive(true);
    }
  }, [result, mode]);

  const nextFreeQuestion = useCallback(() => {
    setModalOpen(false);
    if (mode === "daily") {
      setMode("free");
    }
    startFree();
  }, [mode, startFree]);

  const toggleMode = useCallback(
    (nextMode: GameMode) => {
      if (nextMode === mode) return;
      if (nextMode === "daily") startDaily();
      else startFree();
    },
    [mode, startDaily, startFree]
  );

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem("ko_sam_ja_muted", String(next));
      return next;
    });
  }, []);

  const changeCategory = useCallback(
    (nextCategory: string) => {
      if (nextCategory === category) return;
      setCategory(nextCategory);
      freeOrderRef.current = [];
      freePositionRef.current = 0;
    },
    [category]
  );

  const changeDifficulty = useCallback(
    (nextDifficulty: string) => {
      if (nextDifficulty === difficulty) return;
      setDifficulty(nextDifficulty);
      freeOrderRef.current = [];
      freePositionRef.current = 0;
    },
    [difficulty]
  );

  // Re-roll free question when category/difficulty changes mid free-play
  useEffect(() => {
    if (mode === "free" && hydrated && questions.length) {
      startFree({ skipEmptyToast: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, difficulty]);

  const answerText = question ? decodeBase64(question.odgovorEnc) : "";

  const dailyCountdownMs = 86400000 - (now % 86400000);

  return {
    state: {
      mode,
      category,
      difficulty,
      question,
      unlocked,
      points,
      questionNumber,
      result,
      total,
      streak,
      muted,
      feedback,
      solved,
      modalOpen,
      rulesOpen,
      dailyCountdownActive,
      savedDailyResult,
      toast,
      answerText,
      dailyCountdownMs,
      hydrated,
    },
    actions: {
      toggleMode,
      toggleMuted,
      revealNextClue,
      submitGuess,
      skipQuestion,
      closeModal,
      nextFreeQuestion,
      changeCategory,
      changeDifficulty,
      openRules: () => setRulesOpen(true),
      closeRules: () => setRulesOpen(false),
      showToast,
      clearFeedback: () => setFeedback(null),
    },
  };
}

export type QuizGame = ReturnType<typeof useQuizGame>;
