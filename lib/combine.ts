// The heart of the game: resolve the result of combining two concepts.
//
// Lookup order (fastest → slowest), guaranteeing a pair is generated at most once:
//   0. in-process LRU        (~0ms)
//   1. Redis                 (<10ms)
//   2. Postgres              (<50ms)
//   3. model generation      (cold path — only for genuinely new pairs)
//
// `prime()` runs the same pipeline WITHOUT counting a craft, so we can
// speculatively pre-generate likely pairs (e.g. on hover) ahead of time.
import type { Concept, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { recipeMem } from "./memcache";
import { redisGet, redisSet } from "./redis";
import { normalizePair, redisPairKey } from "./pair";
import { generateConcept } from "./ai/generate";
import { toConceptDTO } from "./serialize";
import type { CombineResult, ConceptDTO } from "./types";

interface EnsureResult {
  result: ConceptDTO;
  isNewDiscovery: boolean; // produced a concept that never existed before
  isFirstCraft: boolean; // this exact pair had never been crafted before
}

// Generation dedup: if a pair is already being generated (e.g. prefetched on
// hover), concurrent callers await the same work instead of hitting the model
// twice. This is what lets speculative priming actually save the user time.
const inflight = new Map<string, Promise<EnsureResult>>();

export async function combine(
  leftId: string,
  rightId: string,
  userId?: string,
): Promise<CombineResult> {
  const { left, right } = await loadPair(leftId, rightId);
  const { key: pairKey } = normalizePair(left.name, right.name);
  const rKey = redisPairKey(pairKey);

  // Tier 0 — in-process memory.
  const mem = recipeMem.get(pairKey);
  if (mem) {
    void bump(pairKey, mem.id);
    return { result: mem, source: "memory", isNewDiscovery: false, isFirstCraft: false };
  }

  // Tier 1 — Redis.
  const cached = await redisGet(rKey);
  if (cached) {
    const dto = JSON.parse(cached) as ConceptDTO;
    recipeMem.set(pairKey, dto);
    void bump(pairKey, dto.id);
    return { result: dto, source: "redis", isNewDiscovery: false, isFirstCraft: false };
  }

  // Tier 2 — Postgres.
  const existing = await prisma.recipe.findUnique({
    where: { pairKey },
    include: { result: true },
  });
  if (existing) {
    const dto = toConceptDTO(existing.result);
    recipeMem.set(pairKey, dto);
    await redisSet(rKey, JSON.stringify(dto));
    void bump(pairKey, dto.id);
    return { result: dto, source: "database", isNewDiscovery: false, isFirstCraft: false };
  }

  // Tier 3 — generate (dedup-locked). May already be running from a prefetch.
  const ensured = await ensureRecipe(pairKey, left, right, userId);
  void bump(pairKey, ensured.result.id);
  return { ...ensured, source: "generated" };
}

/**
 * Speculatively ensure a pair's recipe exists, generating it if needed, WITHOUT
 * counting a craft or touching stats. Safe to fire-and-forget. Returns fast if
 * the recipe is already known.
 */
export async function prime(leftId: string, rightId: string): Promise<void> {
  const pair = await loadPair(leftId, rightId).catch(() => null);
  if (!pair) return;
  const { left, right } = pair;
  const { key: pairKey } = normalizePair(left.name, right.name);

  if (recipeMem.get(pairKey)) return;
  if (await redisGet(redisPairKey(pairKey))) return;
  if (await prisma.recipe.findUnique({ where: { pairKey }, select: { id: true } })) return;

  await ensureRecipe(pairKey, left, right, undefined);
}

async function ensureRecipe(
  pairKey: string,
  left: Concept,
  right: Concept,
  userId?: string,
): Promise<EnsureResult> {
  // A concurrent prime/combine may have just persisted it.
  const found = await prisma.recipe.findUnique({
    where: { pairKey },
    include: { result: true },
  });
  if (found) {
    return { result: toConceptDTO(found.result), isNewDiscovery: false, isFirstCraft: false };
  }

  const running = inflight.get(pairKey);
  if (running) return running;

  const job = doGenerate(pairKey, left, right, userId);
  inflight.set(pairKey, job);
  try {
    return await job;
  } finally {
    inflight.delete(pairKey);
  }
}

async function doGenerate(
  pairKey: string,
  left: Concept,
  right: Concept,
  userId?: string,
): Promise<EnsureResult> {
  const { concept: gen } = await generateConcept(left.name, right.name);

  try {
    const { resultConcept, isNewConcept } = await prisma.$transaction(async (tx) => {
      // Dedupe the result concept by name — the same idea reached via different
      // pairs is one concept, not many.
      const existingConcept = await tx.concept.findUnique({ where: { name: gen.name } });
      const isNew = !existingConcept;
      const resultConcept =
        existingConcept ??
        (await tx.concept.create({
          data: {
            name: gen.name,
            emoji: gen.emoji,
            description: gen.description,
            category: gen.category,
            rarity: gen.rarity,
            firstDiscoveryUserId: userId ?? null,
          },
        }));

      await tx.recipe.create({
        data: {
          pairKey,
          leftConceptId: left.id,
          rightConceptId: right.id,
          resultConceptId: resultConcept.id,
          isFirstDiscovery: isNew,
          craftCount: 0,
          firstDiscoveryUserId: userId ?? null,
        },
      });

      return { resultConcept, isNewConcept: isNew };
    });

    const dto = toConceptDTO(resultConcept);
    recipeMem.set(pairKey, dto);
    await redisSet(redisPairKey(pairKey), JSON.stringify(dto));
    return { result: dto, isNewDiscovery: isNewConcept, isFirstCraft: true };
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Lost the race — the pair now exists; return the winning row.
      const winner = await prisma.recipe.findUnique({
        where: { pairKey },
        include: { result: true },
      });
      if (winner) {
        const dto = toConceptDTO(winner.result);
        recipeMem.set(pairKey, dto);
        await redisSet(redisPairKey(pairKey), JSON.stringify(dto));
        return { result: dto, isNewDiscovery: false, isFirstCraft: false };
      }
    }
    throw err;
  }
}

async function loadPair(leftId: string, rightId: string) {
  const [left, right] = await Promise.all([
    prisma.concept.findUnique({ where: { id: leftId } }),
    prisma.concept.findUnique({ where: { id: rightId } }),
  ]);
  if (!left || !right) {
    throw new CombineError("One or both concepts do not exist.", 404);
  }
  return { left, right };
}

async function bump(pairKey: string, resultId: string): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.recipe.update({ where: { pairKey }, data: { craftCount: { increment: 1 } } }),
      prisma.concept.update({ where: { id: resultId }, data: { craftCount: { increment: 1 } } }),
    ]);
  } catch {
    /* non-critical stat update */
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as Prisma.PrismaClientKnownRequestError).code === "P2002"
  );
}

export class CombineError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
