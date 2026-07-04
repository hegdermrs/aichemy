// Concept generation. Calls DeepSeek (OpenAI-compatible API) when a key is set;
// otherwise falls back to a deterministic local generator so the game is always
// playable. Swapping providers only requires changing the env vars below.
import OpenAI from "openai";
import { z } from "zod";
import { CATEGORIES, RARITIES, type GeneratedConcept, type Rarity } from "../types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

const GeneratedSchema = z.object({
  name: z.string().min(1).max(60),
  emoji: z.string().min(1).max(8),
  description: z.string().min(1).max(280),
  category: z.string().min(1).max(40),
  rarity: z.enum(RARITIES),
});

let client: OpenAI | null = null;
function getClient(): OpenAI | null {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: key,
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    });
  }
  return client;
}

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-pro";

export async function generateConcept(
  left: string,
  right: string,
): Promise<{ concept: GeneratedConcept; usedAI: boolean }> {
  const ai = getClient();
  if (!ai) {
    return { concept: mockGenerate(left, right), usedAI: false };
  }

  try {
    const completion = await ai.chat.completions.create({
      model: MODEL,
      // deepseek-v4-pro is a reasoning model: it spends ~600+ tokens thinking
      // (in reasoning_content) before emitting the JSON answer in `content`.
      // Budget generously or `content` comes back empty and we fall back to mock.
      max_tokens: 2048,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(left, right) },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = GeneratedSchema.parse(extractJson(text));
    return { concept: normalize(parsed), usedAI: true };
  } catch (err) {
    console.warn("[generate] AI generation failed, using mock:", (err as Error).message);
    return { concept: mockGenerate(left, right), usedAI: false };
  }
}

function extractJson(text: string): unknown {
  // Tolerate stray prose or accidental code fences around the JSON object.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}

function normalize(c: GeneratedConcept): GeneratedConcept {
  return {
    ...c,
    name: c.name.trim(),
    category: (CATEGORIES as readonly string[]).includes(c.category)
      ? c.category
      : titleCase(c.category.trim()) || "Applications",
  };
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

// --- Deterministic mock ---------------------------------------------------
// Produces a stable, plausible-looking concept for a pair without any network
// call. Same inputs always yield the same output, preserving permanence.

const MOCK_EMOJI = ["🤖", "🧠", "⚡", "🔮", "🛰️", "🧩", "🌐", "💡", "🔗", "📡", "🧬", "✨"];
const MOCK_PATTERNS = [
  (a: string, b: string) => `${a} ${b}`,
  (a: string, b: string) => `${b} ${a}`,
  (a: string, b: string) => `${a}-Powered ${b}`,
  (a: string, b: string) => `${a} ${b} System`,
  (a: string, b: string) => `Hybrid ${a} ${b}`,
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mockGenerate(left: string, right: string): GeneratedConcept {
  const [a, b] = left.toLowerCase() <= right.toLowerCase() ? [left, right] : [right, left];
  const h = hash(`${a}|${b}`);
  // Use unsigned shifts — `h` can exceed 2^31, and a signed `>>` would yield a
  // negative index (and thus `undefined`) for those values.
  const pattern = MOCK_PATTERNS[h % MOCK_PATTERNS.length];
  const emoji = MOCK_EMOJI[(h >>> 3) % MOCK_EMOJI.length];
  const category = CATEGORIES[(h >>> 6) % CATEGORIES.length];
  const rarity = RARITIES[(h >>> 9) % RARITIES.length] as Rarity;
  const name = pattern(shortName(a), shortName(b));
  return {
    name,
    emoji,
    description: `A concept blending ${left} and ${right}. (Offline mock result — add a DEEPSEEK_API_KEY for real AI-generated concepts.)`,
    category,
    rarity,
  };
}

function shortName(s: string): string {
  const word = s.split(/\s+/)[0];
  return word[0].toUpperCase() + word.slice(1);
}
