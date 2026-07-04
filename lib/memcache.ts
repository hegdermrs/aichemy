// In-process LRU cache — the fastest tier (tier 0) of the recipe lookup chain.
// Survives for the lifetime of the server process and is shared across requests.
import { LRUCache } from "lru-cache";
import type { ConceptDTO } from "./types";

const globalForMem = globalThis as unknown as {
  recipeMem: LRUCache<string, ConceptDTO> | undefined;
};

export const recipeMem =
  globalForMem.recipeMem ??
  new LRUCache<string, ConceptDTO>({
    max: 10_000,
  });

if (process.env.NODE_ENV !== "production") globalForMem.recipeMem = recipeMem;
