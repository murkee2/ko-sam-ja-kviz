const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ Greška: GEMINI_API_KEY nije postavljen u .env fajlu!");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const MODEL = 'gemini-3.6-flash';
const BATCH_SIZE = 25;
const MAX_RETRIES_PER_BATCH = 3;
const DATA_PATH = path.join(__dirname, 'data', 'questions.json');

// Rebalanced target per category so the pool ends up ~1000 total and no
// category lags far behind the others (existing counts were very uneven).
const CATEGORY_TARGETS = {
  'Sport': 145,
  'Geografija': 145,
  'Historija': 145,
  'Film i muzika': 145,
  'Tehnologija': 145,
  'Nauka': 140,
  'Književnost i umjetnost': 135,
};

// --- Normalizacija (portovano identično iz app.js) ---
function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('bs-BA')
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function decodeBase64(value) {
  return Buffer.from(value, 'base64').toString('utf-8');
}

function encodeBase64(value) {
  return Buffer.from(value, 'utf-8').toString('base64');
}

function loadExisting() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const existing = JSON.parse(raw);
  const maxId = existing.reduce((m, q) => Math.max(m, q.id), 0);
  return { existing, nextId: maxId + 1 };
}

function buildAnswerIndex(questions) {
  const set = new Set();
  for (const q of questions) {
    set.add(normalize(decodeBase64(q.odgovorEnc)));
    (q.aliasEnc || []).forEach((a) => set.add(normalize(decodeBase64(a))));
  }
  return set;
}

function validateItem(raw, category, answerIndex) {
  const errors = [];
  if (!raw.odgovor || typeof raw.odgovor !== 'string') errors.push('missing odgovor');
  if (!Array.isArray(raw.tragovi) || raw.tragovi.length !== 5) errors.push('tragovi mora imati tačno 5 stavki');
  if (raw.tragovi?.some((c) => typeof c !== 'string' || c.trim().length < 10)) errors.push('trag prekratak/prazan');

  if (errors.length) return { ok: false, errors };

  const normAnswer = normalize(raw.odgovor);
  const normAliases = (raw.alias || []).map(normalize);

  if (normAnswer.length < 2) errors.push('odgovor prekratak nakon normalizacije');
  if (answerIndex.has(normAnswer)) errors.push(`duplikat odgovora: ${raw.odgovor}`);
  for (const na of normAliases) {
    if (na.length > 2 && answerIndex.has(na)) errors.push(`alias se kosi sa postojećim odgovorom: ${raw.odgovor}`);
  }

  const normClue1 = normalize(raw.tragovi[0]);
  if (normAnswer.length > 2 && normClue1.includes(normAnswer)) {
    errors.push(`trag 1 odaje odgovor: "${raw.tragovi[0]}"`);
  }
  for (const na of normAliases) {
    if (na.length > 3 && normClue1.includes(na)) {
      errors.push(`trag 1 odaje alias: "${raw.tragovi[0]}"`);
    }
  }

  return { ok: errors.length === 0, errors };
}

async function generateBatch(category, count, existingSampleAnswers) {
  const prompt = `Generiši ${count} raznovrsnih i zanimljivih pojmova iz kategorije "${category}" za kviz igru 'Ko sam ja?' na bosanskom jeziku.

Svaki pojam MORA imati tačno 5 tragova poredanih strogo od 1 (najteži/najapstraktniji) do 5 (najočigledniji, skoro direktno imenuje pojam).

KRITIČNO PRAVILO za Trag 1: ne smije sadržavati ime, prezime, nadimak, naziv, ili bilo koji dio odgovora niti njegovu direktnu parafrazu (npr. za grad "grada čelika" kad je odgovor klub sa riječi "čelik" u imenu). Trag 1 smije spomenuti samo posredan kontekst: epohu, oblast, apstraktnu činjenicu, mjesto rođenja i sl.

Izbjegavaj sljedeće već iskorištene pojmove (ne ponavljaj ih): ${existingSampleAnswers.join(', ')}.

U polje "alias" uključi alternativne nazive (bez kvačica, nadimke, samo prezime ako je relevantno).

Vrati ISKLJUČIVO validan JSON niz objekata u ovom formatu:
[
  {
    "kategorija": "${category}",
    "odgovor": "Puno ime/naziv pojma",
    "alias": ["alternativni naziv 1", "alternativni naziv 2"],
    "tragovi": [
      "Trag 1 - najteži, bez imena/naziva pojma.",
      "Trag 2 - širi kontekst.",
      "Trag 3 - karakteristični detalji.",
      "Trag 4 - prepoznatljive asocijacije.",
      "Trag 5 - očigledan trag koji vodi do rješenja."
    ]
  }
]`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  let text = response.text.trim();
  if (text.startsWith('```json')) {
    text = text.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (text.startsWith('```')) {
    text = text.replace(/^```/, '').replace(/```$/, '').trim();
  }

  return JSON.parse(text);
}

function writeMerged(existing, accepted) {
  const merged = [...existing, ...accepted];
  fs.writeFileSync(DATA_PATH, JSON.stringify(merged, null, 2), 'utf-8');
}

async function main() {
  const { existing, nextId } = loadExisting();
  const answerIndex = buildAnswerIndex(existing);
  const accepted = [];
  let currentId = nextId;

  console.log(`📚 Postojeće pitanje: ${existing.length}, novi ID počinje od ${nextId}`);

  for (const [category, target] of Object.entries(CATEGORY_TARGETS)) {
    const alreadyHave = existing.filter((q) => q.kategorija === category).length;
    let needed = Math.max(0, target - alreadyHave);
    console.log(`\n=== ${category}: imamo ${alreadyHave}, cilj ${target}, treba još ${needed} ===`);

    while (needed > 0) {
      const batchSize = Math.min(BATCH_SIZE, needed);
      let attempt = 0;
      let batchAccepted = [];

      while (attempt < MAX_RETRIES_PER_BATCH && batchAccepted.length === 0) {
        attempt++;
        try {
          const sample = existing
            .filter((q) => q.kategorija === category)
            .slice(0, 15)
            .map((q) => decodeBase64(q.odgovorEnc))
            .concat(accepted.filter((q) => q.kategorija === category).map((q) => decodeBase64(q.odgovorEnc)));

          console.log(`  → Pozivam Gemini za ${batchSize} pitanja (pokušaj ${attempt}/${MAX_RETRIES_PER_BATCH})...`);
          const raw = await generateBatch(category, batchSize, sample);

          for (const item of raw) {
            const check = validateItem(item, category, answerIndex);
            if (!check.ok) {
              console.warn(`    ✗ odbačeno "${item.odgovor || '?'}": ${check.errors.join('; ')}`);
              continue;
            }
            const q = {
              id: currentId++,
              kategorija: category,
              tragovi: item.tragovi,
              odgovorEnc: encodeBase64(item.odgovor),
              aliasEnc: (item.alias || []).map(encodeBase64),
            };
            answerIndex.add(normalize(item.odgovor));
            (item.alias || []).forEach((a) => answerIndex.add(normalize(a)));
            batchAccepted.push(q);
          }
          console.log(`    ✓ prihvaćeno ${batchAccepted.length}/${raw.length}`);
        } catch (err) {
          console.error(`    ⚠ greška u pozivu (pokušaj ${attempt}):`, err.message);
        }
      }

      accepted.push(...batchAccepted);
      needed -= batchAccepted.length;
      writeMerged(existing, accepted);

      if (batchAccepted.length === 0) {
        console.error(`  ✗ odustajem od ovog batch-a nakon ${MAX_RETRIES_PER_BATCH} pokušaja, prelazim dalje`);
        break;
      }
    }
  }

  console.log(`\n✅ Gotovo. Dodano ${accepted.length} novih pitanja. Ukupno: ${existing.length + accepted.length}`);
}

main().catch((err) => {
  console.error('❌ Fatalna greška:', err);
  process.exit(1);
});
