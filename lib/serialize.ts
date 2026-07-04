import type { Concept } from "@prisma/client";
import type { ConceptDTO, Rarity } from "./types";

export function toConceptDTO(c: Concept): ConceptDTO {
  return {
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    description: c.description,
    category: c.category,
    rarity: c.rarity as Rarity,
    isStarter: c.isStarter,
    craftCount: c.craftCount,
    createdAt: c.createdAt.toISOString(),
  };
}
