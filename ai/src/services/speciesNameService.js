import Groq from "groq-sdk";
import { getWikipediaName } from "../utils/wikiService.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const AI_LOCAL_NAME_ENABLED = process.env.GROQ_LOCAL_NAME_ENABLED === "true";

const LOCAL_NAME_DICTIONARY = {
  "felis catus": "cat",
  "sus scrofa": "wild boar",
  "ficus benghalensis": "banyan",
  "platanista gangetica": "gangetic dolphin",
  "gavialis gangeticus": "gharial",
  "bos gaurus": "gaur",
  "elanus caeruleus": "black-winged kite"
};

let aiDisabledUntil = 0;
let aiFailureCount = 0;

function isAiTemporarilyDisabled() {
  return Date.now() < aiDisabledUntil;
}

function markAiFailure() {
  aiFailureCount += 1;

  // Exponential-ish backoff to avoid hammering the provider on repeated failures.
  const cooldownSeconds = Math.min(60, 5 * aiFailureCount);
  aiDisabledUntil = Date.now() + cooldownSeconds * 1000;
}

function resetAiFailureState() {
  aiFailureCount = 0;
  aiDisabledUntil = 0;
}

function lookupLocalDictionaryName(scientificName) {
  const key = String(scientificName || "").trim().toLowerCase();
  return LOCAL_NAME_DICTIONARY[key] || null;
}

export async function getLocalSpeciesName(scientificName) {

  if (!scientificName || typeof scientificName !== "string") {
    return "Unknown Species";
  }

  const dictionaryName = lookupLocalDictionaryName(scientificName);

  if (dictionaryName) {
    return dictionaryName;
  }

  // STEP 1 — Try Wikipedia
  const wikiName = await getWikipediaName(scientificName);

  if (wikiName) {
    return wikiName;
  }

  // STEP 2 — AI fallback

  if (!AI_LOCAL_NAME_ENABLED) {
    return scientificName;
  }

  if (!process.env.GROQ_API_KEY) {
    return scientificName;
  }

  if (isAiTemporarilyDisabled()) {
    return scientificName;
  }

  try {

    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "user",
          content: `Convert this scientific species name into a local Indian common name.
If Hindi/local name is available, return that.
If no local name exists, return a commonly used Indian English name.
Return ONLY the name, no extra text.

Scientific Name: ${scientificName}`
        }
      ],
      temperature: 0.2,
      max_completion_tokens: 32
    });

    const result = completion?.choices?.[0]?.message?.content?.trim();

    resetAiFailureState();

    return result || scientificName;

  } catch (error) {

    markAiFailure();

    if (aiFailureCount <= 3) {
      console.log("AI conversion fallback in use");
    }

    return scientificName;
  }
}