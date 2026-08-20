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

async function generateQuestions() {
  console.log("⏳ Generišem pitanja preko Gemini API-ja...");
  try {
    const prompt = `Generiši 30 raznovrsnih i zanimljivih pojmova za kviz igru 'Ko sam ja?' na bosanskom jeziku.
Kategorije mogu biti: Sport, Geografija, Historija, Nauka, Film i muzika, Tehnologija, Poznate ličnosti iz BiH, regije i svijeta.

Svaki pojam MORA imati tačno 5 tragova poredanih strogo od 1 (najteži/apstraktan) do 5 (najočigledniji).
U polje "alias" uključi alternativne načine pisanja (npr. samo prezime, bez kvačica, nadimak).

Vrati ISKLJUČIVO validan JSON niz objekata u ovom formatu:
[
  {
    "id": 1,
    "kategorija": "Sport",
    "odgovor": "Edin Džeko",
    "alias": ["Džeko", "Edin Dzeko", "Dzeko", "Dijamant"],
    "tragovi": [
      "Rođen sam 1986. godine u Sarajevu.",
      "Bio sam najbolji strijelac u dvije od 'liga petice' (Njemačka i Italija).",
      "Igrao sam za Wolfsburg, Manchester City, Romu i Inter.",
      "Navijači me zovu 'Bosanski dijamant'.",
      "Kapiten sam i najbolji strijelac u historiji fudbalske reprezentacije BiH."
    ]
  }
]`;

const response = await ai.models.generateContent({
  model: 'gemini-3.5-flash', // <--- Promijeni ovdje u 3.6
  contents: prompt,
  config: {
    responseMimeType: 'application/json'
  }
});

    let dataText = response.text.trim();
    if (dataText.startsWith('```json')) {
      dataText = dataText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (dataText.startsWith('```')) {
      dataText = dataText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const questions = JSON.parse(dataText);

    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, 'questions.json');
    fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf-8');

    console.log(`✅ Uspješno generisano ${questions.length} pitanja u '${filePath}'!`);
  } catch (error) {
    console.error("❌ Greška tokom generisanja:", error);
  }
}

generateQuestions();