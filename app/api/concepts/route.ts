import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toConceptDTO } from "@/lib/serialize";

export const runtime = "nodejs";

// Returns the starter concepts used to initialize a new player's inventory.
// Pass ?all=true to fetch every known concept (used by future graph/browse views).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "true";

  const concepts = await prisma.concept.findMany({
    where: all ? undefined : { isStarter: true },
    orderBy: [{ isStarter: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ concepts: concepts.map(toConceptDTO) });
}
