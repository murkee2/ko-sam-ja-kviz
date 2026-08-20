# 🧠 Ko sam ja? — Kviz po tragovima

Moderni, interaktivni web kviz znanja u Wordle stilu, izrađen u čistom JavaScriptu (Vanilla JS), HTML5 i CSS3 sa *glassmorphism* tamnim dizajnom. Igrači pogađaju tajne pojmove (ličnosti, gradove, spomenike, historijske događaje i izume) na osnovu najviše 5 postepenih tragova.

---

## ✨ Glavne funkcionalnosti

* **📅 Dnevni izazov (Daily Challenge):** Jedinstven, zajednički pojam za sve igrače svakog dana sa praćenjem niza pobjeda (*Streak* 🔥).
* **🎲 Slobodna igra (Free Play):** Neograničeno igranje sa preko 300 pažljivo pripremljenih pitanja.
* **🏷️ Tematski filteri:** Filtriranje pojmova po kategorijama (Sport, Geografija, Historija, Film i muzika, Tehnologija, Nauka, Književnost).
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

## 📂 Struktura projekta

```text
ko-sam-ja-kviz/
│
├── index.html            # Glavna HTML struktura sa semantikom i modalima
├── style.css             # Glassmorphism stilovi, ambient glow i animacije
├── app.js                # Game engine logika, audio sinteza i stanje igre
│
├── data/
│   └── questions.json    # Baza pitanja sa Base64 zaštićenim odgovorima
│
├── generate_data.js      # Node.js skripta za AI generisanje novih pitanja
├── package.json          # Zavisnosti za generatorsku skriptu
└── README.md             # Dokumentacija projekta

🚀 Pokretanje lokalno
Pošto projekat koristi standardni browser fetch API za učitavanje questions.json, potrebno ga je pokrenuti preko lokalnog servera:

Kloniraj repozitorij:

Bash
git clone [https://github.com/murkee2/ko-sam-ja-kviz.git](https://github.com/murkee2/ko-sam-ja-kviz.git)
cd ko-sam-ja-kviz
Pokreni lokalni server:

Preko VS Code Live Server ekstenzije: Desni klik na index.html > Open with Live Server.

Ili putem terminala:

Bash
npx serve .
Otvori ponuđeni link u browseru (npr. http://localhost:3000).

🤖 Generisanje novih pitanja (AI Generator)
Projekat sadrži Node.js skriptu za automatsko generisanje novih pitanja koristeći Google Gemini API:

Instaliraj zavisnosti:

Bash
npm install
Kreiraj .env fajl u root folderu i postavi svoj API ključ:

Code snippet
GEMINI_API_KEY=tvoj_gemini_api_kljuc
Pokreni skriptu:

Bash
node generate_data.js
Skripta će automatski generisati pitanja, enkodirati rješenja u Base64 i ažurirati data/questions.json.