// Achievement definitions + evaluation. Pure functions over game state so both
// the store (to detect unlocks) and the UI (to show progress) share one source.
import {
  Archive,
  Compass,
  Crown,
  Diamond,
  FlaskConical,
  FolderTree,
  Gem,
  GraduationCap,
  Library,
  Medal,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { RARITIES, type ConceptDTO, type Rarity } from "./types";

export interface AchState {
  discoveredCount: number; // non-starter elements the player has crafted
  rarities: Record<string, number>; // counts among discovered elements
  categories: number; // distinct categories among discovered elements
  level: number;
}

export interface Achievement {
  key: string;
  title: string;
  icon: LucideIcon;
  description: string;
  test: (s: AchState) => boolean;
  progress?: (s: AchState) => { have: number; need: number };
}

/** Derive the achievement-relevant snapshot. Starters don't count as discoveries. */
export function deriveState(inventory: ConceptDTO[], level: number): AchState {
  const discovered = inventory.filter((c) => !c.isStarter);
  const rarities: Record<string, number> = {};
  const cats = new Set<string>();
  for (const c of discovered) {
    rarities[c.rarity] = (rarities[c.rarity] ?? 0) + 1;
    cats.add(c.category);
  }
  return {
    discoveredCount: discovered.length,
    rarities,
    categories: cats.size,
    level,
  };
}

// Count of discovered elements at or above a given rarity.
function rarityAtLeast(s: AchState, r: Rarity): number {
  const idx = RARITIES.indexOf(r);
  return RARITIES.slice(idx).reduce((n, rr) => n + (s.rarities[rr] ?? 0), 0);
}

const count = (need: number) => (s: AchState) => ({ have: s.discoveredCount, need });

export const ACHIEVEMENTS: Achievement[] = [
  { key: "first", title: "First Transmutation", icon: Sparkles, description: "Transmute your first element.", test: (s) => s.discoveredCount >= 1 },
  { key: "ten", title: "Dabbler", icon: FlaskConical, description: "Discover 10 elements.", test: (s) => s.discoveredCount >= 10, progress: count(10) },
  { key: "collector", title: "Collector", icon: Library, description: "Discover 25 elements.", test: (s) => s.discoveredCount >= 25, progress: count(25) },
  { key: "hoarder", title: "Hoarder", icon: Archive, description: "Discover 50 elements.", test: (s) => s.discoveredCount >= 50, progress: count(50) },
  { key: "centurion", title: "Centurion", icon: Medal, description: "Discover 100 elements.", test: (s) => s.discoveredCount >= 100, progress: count(100) },
  { key: "rare", title: "Rare Find", icon: Gem, description: "Discover a Rare element.", test: (s) => rarityAtLeast(s, "RARE") >= 1 },
  { key: "epic", title: "Epic Discovery", icon: Diamond, description: "Discover an Epic element.", test: (s) => rarityAtLeast(s, "EPIC") >= 1 },
  { key: "legendary", title: "The Philosopher's Stone", icon: Crown, description: "Discover a Legendary element.", test: (s) => rarityAtLeast(s, "LEGENDARY") >= 1 },
  { key: "polymath", title: "Polymath", icon: Compass, description: "Span 5 categories.", test: (s) => s.categories >= 5, progress: (s) => ({ have: s.categories, need: 5 }) },
  { key: "taxonomist", title: "Taxonomist", icon: FolderTree, description: "Span 8 categories.", test: (s) => s.categories >= 8, progress: (s) => ({ have: s.categories, need: 8 }) },
  { key: "adept", title: "Adept", icon: GraduationCap, description: "Reach level 3.", test: (s) => s.level >= 3, progress: (s) => ({ have: s.level, need: 3 }) },
  { key: "magus", title: "Magus", icon: WandSparkles, description: "Reach level 6.", test: (s) => s.level >= 6, progress: (s) => ({ have: s.level, need: 6 }) },
];

export const ACH_BY_KEY: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.key, a]),
);

export function evaluate(s: AchState): string[] {
  return ACHIEVEMENTS.filter((a) => a.test(s)).map((a) => a.key);
}
