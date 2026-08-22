import type { GameMode, RoundResult } from "@/types/question";

export function buildResultText(
  result: RoundResult | null,
  mode: GameMode,
  streak: number,
  unlocked: number
): string {
  const solvedClues = result?.victory ? result.unlocked : 0;
  let squares = "";
  for (let i = 1; i <= 5; i++) {
    if (i === solvedClues && result?.victory) squares += "🟩";
    else if (i <= (result?.unlocked ?? 0)) squares += "🟥";
    else squares += "⬜";
  }

  const modeLabel = mode === "daily" ? "📅 Dnevni izazov" : "🎲 Slobodna igra";
  const pointsUsed = result?.points ?? 0;
  const cluesUsed = result?.unlocked ?? unlocked;
  const url = typeof window !== "undefined" ? window.location.href : "";

  return `Ko sam ja? ${modeLabel}\n${squares}\n${pointsUsed}/5 bodova • ${cluesUsed}/5 tragova\n🔥 Streak: ${streak}\n\nIgraj i ti: ${url}`;
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}
