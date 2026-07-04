import { NextResponse } from "next/server";
import { z } from "zod";
import { enqueuePrefetch } from "@/lib/prefetch";

export const runtime = "nodejs";

const BodySchema = z.object({
  pairs: z
    .array(
      z.object({
        leftId: z.string().min(1),
        rightId: z.string().min(1),
      }),
    )
    .max(40),
});

// Fire-and-forget: enqueue likely pairs for background generation and return
// immediately. The client never waits on this.
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

  const queued = enqueuePrefetch(parsed.data.pairs);
  return NextResponse.json({ queued });
}
