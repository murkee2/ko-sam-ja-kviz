import type { Question } from "@/types/question";

const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

// Eksplicitno mapiranje bosanskih/hrvatskih/srpskih dijakritika na latinicu
// bez kvačica, prije NFD rastavljanja — ovo hvata slučajeve koje golo
// uklanjanje kombinujućih znakova ne bi (npr. dž/đ koji se svode na digraf "dz").
const DIACRITIC_MAP: Record<string, string> = {
  č: "c",
  ć: "c",
  đ: "dj",
  ð: "dj", // eth (U+00F0) — vizuelno gotovo identično sa đ, čest slučajan unos
  š: "s",
  ž: "z",
  dž: "dz",
};

// Normalizacija unosa: lowercase, trim, zamjena dijakritika, uklanjanje
// specijalnih znakova i viška razmaka — tako da "Ðžeko", "dzeko" i "Džeko"
// svi budu ekvivalentni pri poređenju.
export function normalize(value: string | null | undefined): string {
  let result = String(value ?? "")
    .trim()
    .toLocaleLowerCase("bs-BA");

  result = result.replace(/dž/g, "dz");
  result = result.replace(/[čćđšž]/g, (ch) => DIACRITIC_MAP[ch] ?? ch);

  result = result
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "");

  return result;
}

export function decodeBase64(value: string): string {
  try {
    const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return value;
  }
}

export function getAcceptedAnswers(question: Question): string[] {
  const aliases = Array.isArray(question.aliasEnc) ? question.aliasEnc : [];
  return [decodeBase64(question.odgovorEnc), ...aliases.map(decodeBase64)];
}

// Svodi strane pravopisne obrasce na približan bosanski fonetski zapis,
// tako da npr. "Thierry Henry" i "Tijeri Enri" postanu uporedivi, kao i
// englesko "j" (Jones, Jackson) sa bosanskim fonetskim "dž" (Džons, Džekson).
export function phoneticKey(normalized: string): string {
  return normalized
    .replace(/tch/g, "č")
    .replace(/sch/g, "š")
    .replace(/sh/g, "š")
    .replace(/ch/g, "č")
    .replace(/ph/g, "f")
    .replace(/th/g, "t")
    .replace(/kh/g, "h")
    .replace(/qu/g, "kv")
    .replace(/ck/g, "k")
    .replace(/wh/g, "v")
    .replace(/oo/g, "u")
    .replace(/ee/g, "i")
    .replace(/ea/g, "i")
    .replace(/ou/g, "u")
    .replace(/ai/g, "aj")
    .replace(/ey/g, "i")
    .replace(/ay/g, "aj")
    .replace(/j/g, "dz")
    .replace(/y/g, "i")
    .replace(/w/g, "v")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/c/g, "k")
    .replace(/x/g, "ks")
    .replace(/q/g, "k")
    .replace(/(.)\1+/g, "$1");
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let previous = Array.from({ length: n + 1 }, (_, i) => i);
  let current = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    current[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
    }
    [previous, current] = [current, previous];
  }
  return previous[n];
}

// Prag tolerancije grešaka za fuzzy poređenje, po dužini normalizovanog pojma:
// - ispod 4 slova: mora biti tačno (0 grešaka) — prekratki pojmovi su previše
//   rizični za fuzzy poređenje (npr. "Baš" vs "Aš").
// - 4-8 slova: dozvoljena je 1 greška (tipfeler, transponovano slovo...).
// - preko 8 slova: dozvoljene su 2 greške.
export function fuzzyMatchTolerance(length: number): number {
  if (length < 4) return 0;
  if (length <= 8) return 1;
  return 2;
}

export function isCorrectGuess(guess: string, question: Question): boolean {
  const accepted = getAcceptedAnswers(question);
  const normalizedGuess = normalize(guess);
  if (normalizedGuess.length === 0) return false;
  const phoneticGuess = phoneticKey(normalizedGuess);

  return accepted.some((answer) => {
    const normalizedAnswer = normalize(answer);
    if (normalizedAnswer === normalizedGuess) return true;

    const tolerance = Math.min(
      fuzzyMatchTolerance(normalizedAnswer.length),
      fuzzyMatchTolerance(normalizedGuess.length)
    );
    if (tolerance > 0 && levenshtein(normalizedAnswer, normalizedGuess) <= tolerance) return true;

    const phoneticAnswer = phoneticKey(normalizedAnswer);
    if (phoneticAnswer === phoneticGuess) return true;

    const phoneticTolerance = Math.min(
      fuzzyMatchTolerance(phoneticAnswer.length),
      fuzzyMatchTolerance(phoneticGuess.length)
    );
    if (phoneticTolerance > 0 && levenshtein(phoneticAnswer, phoneticGuess) <= phoneticTolerance) return true;

    return false;
  });
}

// Jednostavan deterministički PRNG (mulberry32) sjemenjen datumom, tako da
// svi igrači dobiju isti "nasumični" izbor kategorije/težine tog dana.
export function seededRandom(seed: number): () => number {
  let t = seed + 0x6d2b79f5;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDailySeed(): number {
  return Math.floor(Date.now() / 86400000);
}

export function getDailyQuestion(questions: Question[]): {
  question: Question;
  category: string;
  difficulty: string;
} {
  const dayIndex = getDailySeed();
  const random = seededRandom(dayIndex);

  const categories = [...new Set(questions.map((q) => q.kategorija))];
  const difficulties = ["easy", "medium", "hard"];
  const category = categories[Math.floor(random() * categories.length)];
  const difficulty = difficulties[Math.floor(random() * difficulties.length)];

  let pool = questions.filter((q) => q.kategorija === category && q.tezina === difficulty);
  if (!pool.length) pool = questions.filter((q) => q.kategorija === category);
  if (!pool.length) pool = questions;

  const question = pool[dayIndex % pool.length];
  return { question, category, difficulty };
}

export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyStorageKey(): string {
  return `ko_sam_ja_daily_${getTodayKey()}`;
}

export function pointsLabel(points: number): string {
  return `${points} ${points === 1 ? "bod" : points < 5 ? "boda" : "bodova"}`;
}

export function msUntilNextDay(): number {
  const now = Date.now();
  return 86400000 - (now % 86400000);
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export const CATEGORY_ICONS: Record<string, string> = {
  Sve: "🎭",
  Sport: "⚽",
  Geografija: "🌍",
  Historija: "🏛️",
  "Film i muzika": "🎬",
  Tehnologija: "💻",
  Nauka: "🔬",
  "Književnost i umjetnost": "📖",
  "Bosna i Hercegovina": "🇧🇦",
  "Hrana i piće": "🍽️",
  "Životinje i priroda": "🌿",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Lako",
  medium: "Srednje",
  hard: "Teško",
};

export const CATEGORIES = [
  "Sve",
  "Sport",
  "Geografija",
  "Historija",
  "Film i muzika",
  "Tehnologija",
  "Nauka",
  "Književnost i umjetnost",
  "Bosna i Hercegovina",
  "Hrana i piće",
  "Životinje i priroda",
];
