// Shared domain types and constants.

export const RARITIES = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_META: Record<
  Rarity,
  { label: string; stars: number; color: string; glow: string }
> = {
  COMMON: { label: "Common", stars: 1, color: "#9ca3af", glow: "rgba(156,163,175,0.35)" },
  UNCOMMON: { label: "Uncommon", stars: 2, color: "#34d399", glow: "rgba(52,211,153,0.45)" },
  RARE: { label: "Rare", stars: 3, color: "#60a5fa", glow: "rgba(96,165,250,0.55)" },
  EPIC: { label: "Epic", stars: 4, color: "#c084fc", glow: "rgba(192,132,252,0.6)" },
  LEGENDARY: { label: "Legendary", stars: 5, color: "#fbbf24", glow: "rgba(251,191,36,0.7)" },
};

// Canonical categories. The AI is asked to prefer these but may extend.
export const CATEGORIES = [
  "Foundations",
  "Languages",
  "Models",
  "Data",
  "Infrastructure",
  "Applications",
  "Agents",
  "Vision",
  "Research",
] as const;
export type Category = (typeof CATEGORIES)[number] | string;

// A concept as sent to the client.
export interface ConceptDTO {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  rarity: Rarity;
  isStarter: boolean;
  craftCount: number;
  createdAt: string;
  firstDiscovererName: string | null;
}

// Result of a combine request.
export interface CombineResult {
  result: ConceptDTO;
  // Where the answer came from — powers the cache-hit-rate stat.
  source: "memory" | "redis" | "database" | "generated";
  // True only when this pair produced a concept that never existed before.
  isNewDiscovery: boolean;
  // True when this exact pair had never been crafted by anyone before.
  isFirstCraft: boolean;
}

// The raw shape we ask the model to return.
export interface GeneratedConcept {
  name: string;
  emoji: string;
  description: string;
  category: string;
  rarity: Rarity;
}
