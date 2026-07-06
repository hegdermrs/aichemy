import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { toConceptDTO } from "@/lib/serialize";

export const runtime = "nodejs";

const BodySchema = z.object({
  ids: z.array(z.string().min(1)).max(2000),
});

// Returns the subgraph of the player's known elements: nodes for each element,
// and one recipe edge per transmutation where the result and BOTH inputs are
// known — i.e. the crafting web the player can actually see.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const ids = parsed.data.ids;
  if (ids.length === 0) {
    return NextResponse.json({ nodes: [], edges: [] });
  }
  const idSet = new Set(ids);

  const [concepts, recipes] = await Promise.all([
    prisma.concept.findMany({ where: { id: { in: ids } } }),
    prisma.recipe.findMany({
      where: { resultConceptId: { in: ids } },
      select: {
        id: true,
        leftConceptId: true,
        rightConceptId: true,
        resultConceptId: true,
      },
    }),
  ]);

  const edges = recipes
    .filter((r) => idSet.has(r.leftConceptId) && idSet.has(r.rightConceptId))
    .map((r) => ({
      id: r.id,
      left: r.leftConceptId,
      right: r.rightConceptId,
      result: r.resultConceptId,
    }));

  return NextResponse.json({
    nodes: concepts.map(toConceptDTO),
    edges,
  });
}
