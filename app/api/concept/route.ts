import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toConceptDTO } from "@/lib/serialize";

export const runtime = "nodejs";

// Fresh detail for a single concept (discoverer, global craft count, etc.).
// Always read straight from Postgres so attribution stays in sync for everyone.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const concept = await prisma.concept.findUnique({ where: { id } });
  if (!concept) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Parents: the earliest recipe that produced this concept, if any.
  const recipe = await prisma.recipe.findFirst({
    where: { resultConceptId: id },
    orderBy: { createdAt: "asc" },
    include: { left: true, right: true },
  });

  return NextResponse.json({
    concept: toConceptDTO(concept),
    parents: recipe
      ? { left: toConceptDTO(recipe.left), right: toConceptDTO(recipe.right) }
      : null,
  });
}
