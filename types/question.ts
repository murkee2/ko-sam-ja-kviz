export type Difficulty = "easy" | "medium" | "hard";

export interface Question {
  id: number;
  kategorija: string;
  tezina: Difficulty;
  tragovi: string[];
  odgovorEnc: string;
  aliasEnc?: string[];
}

export interface RoundResult {
  victory: boolean;
  points: number;
  unlocked: number;
}

export interface DailyStorageResult extends RoundResult {
  completed: true;
}

export type GameMode = "daily" | "free";
