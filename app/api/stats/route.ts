import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { metricsSnapshot } from "@/lib/metrics";
import { toConceptDTO } from "@/lib/serialize";

export const runtime = "nodejs";

// Global stats: how big the shared universe is, plus this process's live
// cache/latency metrics and a couple of "hall of fame" concepts.
export async function GET() {
  const [totalConcepts, totalRecipes, mostCrafted, rarest] = await Promise.all([
    prisma.concept.count(),
    prisma.recipe.count(),
    prisma.concept.findFirst({
      where: { isStarter: false },
      orderBy: { craftCount: "desc" },
    }),
    prisma.concept.findFirst({
      where: { rarity: "LEGENDARY" },
      orderBy: { craftCount: "desc" },
    }),
  ]);

  return NextResponse.json({
    totalConcepts,
    totalRecipes,
    metrics: metricsSnapshot(),
    mostCrafted: mostCrafted ? toConceptDTO(mostCrafted) : null,
    rarest: rarest ? toConceptDTO(rarest) : null,
  });
}
