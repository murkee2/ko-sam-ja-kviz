"use client";

import type { GameMode } from "@/types/question";

interface HeaderProps {
  mode: GameMode;
  muted: boolean;
  onModeChange: (mode: GameMode) => void;
  onToggleMuted: () => void;
  onOpenRules: () => void;
}

export function Header({ mode, muted, onModeChange, onToggleMuted, onOpenRules }: HeaderProps) {
  return (
    <header className="topbar glass-panel">
      <a className="brand" href="." aria-label="Ko sam ja? Početna stranica">
        <span className="brand-mark">🎭</span>
        <span>
          <strong>KO SAM JA?</strong>
          <small>kviz po tragovima</small>
        </span>
      </a>

      <div className="topbar-actions">
        <div className="mode-switch" role="group" aria-label="Odabir moda igre">
          <button
            className={`mode-button${mode === "daily" ? " active" : ""}`}
            type="button"
            onClick={() => onModeChange("daily")}
          >
            📅 Dnevni izazov
          </button>
          <button
            className={`mode-button${mode === "free" ? " active" : ""}`}
            type="button"
            onClick={() => onModeChange("free")}
          >
            🎲 Slobodna igra
          </button>
        </div>
        <div className="icon-actions">
          <button className="icon-button" type="button" aria-label="Pravila igre" title="Pravila igre" onClick={onOpenRules}>
            ❓
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={muted ? "Uključi zvuk" : "Isključi zvuk"}
            title="Zvuk"
            onClick={onToggleMuted}
          >
            <span>{muted ? "🔇" : "🔊"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
