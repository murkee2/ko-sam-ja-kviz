"use client";

import { useEffect } from "react";

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

export function RulesModal({ open, onClose }: RulesModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal glass-panel">
        <button className="modal-close" type="button" aria-label="Zatvori" onClick={onClose}>
          ×
        </button>
        <div className="result-icon">❓</div>
        <span className="eyebrow">PRAVILA KVIZA</span>
        <h2 id="rules-title">Kako igrati &quot;Ko sam ja?&quot;</h2>

        <div className="rules-content">
          <p>
            Cilj igre je odgonetnuti skriveni pojam (ličnost, grad, građevinu, historijski događaj ili izum) uz što
            manje otkrivenih tragova.
          </p>
          <ul>
            <li>
              <strong>Trag 1 (5 bodova):</strong> Najteži i najapstraktniji trag.
            </li>
            <li>
              <strong>Tragovi 2–5 (4 do 1 bod):</strong> Svaki novi trag olakšava pogađanje, ali smanjuje nagradu za 1
              bod.
            </li>
            <li>
              <strong>Normalizacija unosa:</strong> Kvačice nisu obavezne (npr. unos <em>dzeko</em> ili{" "}
              <em>Džeko</em> vrijede jednako).
            </li>
            <li>
              <strong>Dnevni izazov:</strong> Jedan zajednički pojam dnevno za sve igrače — nasumična kategorija i
              težina (ista za sve, mijenja se svaki dan) — uz praćenje niza pobjeda (streak 🔥).
            </li>
            <li>
              <strong>Slobodna igra:</strong> Neograničeno igranje uz preko 1000 pojmova, filtriranih po temi i po
              težini (🟢 Lako, 🟡 Srednje, 🔴 Teško).
            </li>
          </ul>
        </div>

        <div className="modal-actions">
          <button className="button primary" type="button" onClick={onClose}>
            Razumijem, igraj! →
          </button>
        </div>
      </div>
    </div>
  );
}
