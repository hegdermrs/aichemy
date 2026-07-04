// Seeds the 8 starter concepts. Idempotent — safe to run repeatedly.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STARTERS = [
  { name: "LLM", emoji: "🧠", category: "Models", rarity: "COMMON" as const, description: "A large language model trained to predict and generate text." },
  { name: "Python", emoji: "🐍", category: "Languages", rarity: "COMMON" as const, description: "The dominant programming language for AI and data science." },
  { name: "Prompt", emoji: "💬", category: "Foundations", rarity: "COMMON" as const, description: "An instruction given to an AI model to elicit a response." },
  { name: "GPU", emoji: "🎮", category: "Infrastructure", rarity: "COMMON" as const, description: "A parallel processor that accelerates model training and inference." },
  { name: "API", emoji: "🔌", category: "Infrastructure", rarity: "COMMON" as const, description: "An interface that lets software talk to other software." },
  { name: "Data", emoji: "📊", category: "Data", rarity: "COMMON" as const, description: "The raw information that AI systems learn from." },
  { name: "Cloud", emoji: "☁️", category: "Infrastructure", rarity: "COMMON" as const, description: "On-demand remote compute and storage that powers modern AI." },
  { name: "Vision", emoji: "👁️", category: "Vision", rarity: "COMMON" as const, description: "The ability of a machine to interpret and understand images." },
];

async function main() {
  for (const s of STARTERS) {
    await prisma.concept.upsert({
      where: { name: s.name },
      update: { emoji: s.emoji, category: s.category, description: s.description, isStarter: true },
      create: { ...s, isStarter: true },
    });
  }
  const count = await prisma.concept.count();
  console.log(`Seeded starters. Total concepts: ${count}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
