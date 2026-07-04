// Progression / XP system.
//
// XP comes from the rarity of the concepts you've unlocked (rarer = more XP).
// Leveling is deliberately NON-linear: each level costs more than the last,
// so early levels come fast and later ones are a real grind.
import { RARITY_META, type ConceptDTO } from "./types";

/** XP granted by a single unlocked concept, based on its rarity (1–5). */
export function conceptXp(rarity: ConceptDTO["rarity"]): number {
  return RARITY_META[rarity].stars;
}

/** Total XP for a whole inventory. */
export function totalXp(inventory: ConceptDTO[]): number {
  return inventory.reduce((sum, c) => sum + conceptXp(c.rarity), 0);
}

/** XP required to advance FROM `level` to `level + 1`. Grows super-linearly. */
export function xpForLevel(level: number): number {
  return Math.round(8 * Math.pow(level, 1.6)) + 4;
}

export interface LevelInfo {
  level: number;
  into: number; // XP earned into the current level
  need: number; // XP needed to finish the current level
  progress: number; // 0..1
  totalXp: number;
}

/** Resolve a total-XP amount into a level + progress. */
export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let rem = Math.max(0, Math.floor(xp));
  while (rem >= xpForLevel(level)) {
    rem -= xpForLevel(level);
    level += 1;
  }
  const need = xpForLevel(level);
  return { level, into: rem, need, progress: need ? rem / need : 0, totalXp: xp };
}

// Alchemy-flavored rank titles. Caps out at the last entry.
const RANKS = [
  "Apprentice",
  "Novice",
  "Adept",
  "Artificer",
  "Alchemist",
  "Magus",
  "Sage",
  "Master Alchemist",
  "Grand Magus",
  "Philosopher",
];

export function rankForLevel(level: number): string {
  return RANKS[Math.min(level - 1, RANKS.length - 1)];
}
