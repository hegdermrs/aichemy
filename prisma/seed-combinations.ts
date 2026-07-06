// Bulk-generate all 28 combinations of the 8 starter concepts using AI.
// Run via: DATABASE_URL="..." npx tsx prisma/seed-combinations.ts
import { PrismaClient } from "@prisma/client";
import { generateConcept } from "../lib/ai/generate";
import { normalizePair } from "../lib/pair";

const prisma = new PrismaClient();

async function main() {
  const starters = await prisma.concept.findMany({ where: { isStarter: true } });
  console.log(`Found ${starters.length} starter concepts: ${starters.map((s) => s.name).join(", ")}`);

  // Generate all unique pairs (28 for 8 concepts)
  const pairs: { left: (typeof starters)[0]; right: (typeof starters)[0] }[] = [];
  for (let i = 0; i < starters.length; i++) {
    for (let j = i + 1; j < starters.length; j++) {
      pairs.push({ left: starters[i], right: starters[j] });
    }
  }
  console.log(`Total pairs to generate: ${pairs.length}\n`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const { left, right } of pairs) {
    const { key: pairKey } = normalizePair(left.name, right.name);

    // Skip if recipe already exists
    const existing = await prisma.recipe.findUnique({ where: { pairKey } });
    if (existing) {
      console.log(`  SKIP  ${left.name} + ${right.name} → already exists`);
      skipped++;
      continue;
    }

    console.log(`  GEN   ${left.name} + ${right.name} → ...`);
    try {
      const { concept: gen, usedAI } = await generateConcept(left.name, right.name);

      // Persist in a transaction (dedup concept by name, create recipe)
      await prisma.$transaction(async (tx) => {
        const existingConcept = await tx.concept.findUnique({ where: { name: gen.name } });
        const resultConcept =
          existingConcept ??
          (await tx.concept.create({
            data: {
              name: gen.name,
              emoji: gen.emoji,
              description: gen.description,
              category: gen.category,
              rarity: gen.rarity,
            },
          }));

        await tx.recipe.create({
          data: {
            pairKey,
            leftConceptId: left.id,
            rightConceptId: right.id,
            resultConceptId: resultConcept.id,
            isFirstDiscovery: !existingConcept,
            craftCount: 0,
          },
        });

        return resultConcept;
      });

      const tag = usedAI ? "AI" : "mock";
      console.log(`  DONE  ${left.name} + ${right.name} → ${gen.emoji} ${gen.name} [${tag}]`);
      generated++;
    } catch (err) {
      console.error(`  FAIL  ${left.name} + ${right.name}: ${(err as Error).message}`);
      errors++;
    }

    // Small delay to not hammer the API
    if (generated > 0 && generated % 5 === 0) {
      console.log(`\n  --- progress: ${generated} generated, ${skipped} skipped, ${errors} errors ---\n`);
    }
  }

  const total = await prisma.concept.count();
  const recipeCount = await prisma.recipe.count();
  console.log(`\nDone. Generated: ${generated}, Skipped: ${skipped}, Errors: ${errors}`);
  console.log(`Total concepts: ${total}, Total recipes: ${recipeCount}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
