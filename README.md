# 🧠 Ko sam ja? — Kviz po tragovima

Moderni, interaktivni web kviz znanja u Wordle stilu, izrađen u **Next.js (App Router) + TypeScript** sa *glassmorphism* tamnim dizajnom. Igrači pogađaju tajne pojmove (ličnosti, gradove, spomenike, historijske događaje i izume) na osnovu najviše 5 postepenih tragova.

---

## ✨ Glavne funkcionalnosti

* **📅 Dnevni izazov (Daily Challenge):** Jedinstven, zajednički pojam za sve igrače svakog dana — nasumična kategorija i težina, deterministički odabrane po datumu (isto za sve igrače, mijenja se svaki dan) — sa praćenjem niza pobjeda (*Streak* 🔥).
* **🎲 Slobodna igra (Free Play):** Neograničeno igranje sa preko 1000 pažljivo pripremljenih pitanja, filtrirano po kategoriji i po težini (🟢 Lako, 🟡 Srednje, 🔴 Teško).
* **🏷️ Tematski filteri:** Filtriranje pojmova po kategorijama (Sport, Geografija, Historija, Film i muzika, Tehnologija, Nauka, Književnost) i po težini.
* **🔊 Retro Web Audio efekti:** Dinamički zvučni efekti sintetizovani direktno u browseru pomoću Web Audio API-ja (bez eksternih `.mp3` fajlova).
* **🔒 Zaštita od varanja:** Svi odgovori i aliasi u bazi su enkodirani u Base64 formatu kako bi se spriječilo jednostavno čitanje rješenja kroz Inspect element.
* **📋 Wordle-Style dijeljenje:** Kopiranje grafičkog prikaza rezultata sa emojijima (`🟩🟥⬜`) za dijeljenje na društvenim mrežama i chatovima.
* **🎉 Vizuelni efekti:** Canvas konfete animacije pri tačnom odgovoru, glatke tranzicije kartica i responzivan dizajn prilagođen mobilnim uređajima.
* **💾 Lokalno čuvanje:** Čuvanje statistike (ukupni bodovi, streak, zvuk) u `localStorage`.

---

## 🎮 Sistem bodovanja

| Trag | Vrijednost | Opis |
| :--- | :---: | :--- |
| **Trag 1** | **5 bodova** | Najteži i najapstraktniji trag |
| **Trag 2** | **4 boda** | Širi kontekst pojma |
| **Trag 3** | **3 boda** | Karakteristični detalji i dostignuća |
| **Trag 4** | **2 boda** | Prepoznatljive asocijacije |
| **Trag 5** | **1 bod** | Očigledan trag koji vodi do rješenja |

*Pogađanje automatski normalizuje tekst (dijakritika/kvačice nisu obavezne — npr. `dzeko` se priznaje kao `Džeko`).*

---

## 🧱 Tehnički stek

* [Next.js 15](https://nextjs.org/) (App Router, React 19, TypeScript)
* Client-side game state u custom React hookovima (`lib/useQuizGame.ts`)
* `next/font` za Google Font (Plus Jakarta Sans) bez eksternog `<link>`-a
* [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) kao npm zavisnost (umjesto CDN-a)
* Baza pitanja servirana staticki iz `public/data/questions.json`

## 📂 Struktura projekta

```text
ko-sam-ja-kviz/
│
├── app/
│   ├── layout.tsx         # Root layout, meta tagovi, font
│   ├── page.tsx           # Glavna stranica koja sastavlja sve komponente
│   └── globals.css        # Glassmorphism stilovi, ambient glow i animacije
│
├── components/            # Header, ScoreStrip, CategoryPanel, GameCard,
│                           # ResultModal, RulesModal, Toast
│
├── lib/
│   ├── gameLogic.ts        # Normalizacija, fuzzy matching, dnevni seed itd.
│   ├── useQuizGame.ts       # Centralni React hook sa stanjem igre
│   ├── useSound.ts          # Web Audio sintetizator
│   └── shareResult.ts       # Wordle-style tekst za dijeljenje
│
├── types/question.ts       # TypeScript tipovi
│
├── public/data/
│   └── questions.json      # Baza pitanja sa Base64 zaštićenim odgovorima
│
└── README.md
```

## 🚀 Pokretanje lokalno

```bash
npm install
npm run dev
```

Otvori [http://localhost:3000](http://localhost:3000) u browseru.

Za produkcijski build:

```bash
npm run build
npm run start
```

Baza od 1000 pitanja je u potpunosti hardkodovana u `public/data/questions.json` — igra ne poziva nikakav eksterni API.
