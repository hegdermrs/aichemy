import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { recipeMem } from "@/lib/memcache";

export const runtime = "nodejs";

const BodySchema = z.object({
  conceptId: z.string().min(1),
  name: z.string().trim().min(1).max(40),
});

// Backfills the first-discoverer name onto a concept — used the first time a
// player enters their name, right after their discovery. Only sets it if it's
// still empty (the true first discoverer wins; can't be overwritten later).
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

  const { conceptId, name } = parsed.data;
  const updated = await prisma.concept.updateMany({
    where: { id: conceptId, firstDiscovererName: null },
    data: { firstDiscovererName: name },
  });

  // Invalidate any cached DTO so the new discoverer shows up everywhere.
  if (updated.count > 0) {
    for (const key of recipeMem.keys()) recipeMem.delete(key);
  }

  return NextResponse.json({ updated: updated.count });
}
