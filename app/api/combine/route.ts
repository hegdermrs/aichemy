import { NextResponse } from "next/server";
import { z } from "zod";
import { combine, CombineError } from "@/lib/combine";

export const runtime = "nodejs";

const BodySchema = z.object({
  leftId: z.string().min(1),
  rightId: z.string().min(1),
  userId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const started = performance.now();
  try {
    const result = await combine(
      parsed.data.leftId,
      parsed.data.rightId,
      parsed.data.userId,
    );
    const ms = Math.round(performance.now() - started);
    return NextResponse.json({ ...result, ms });
  } catch (err) {
    if (err instanceof CombineError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[/api/combine] error:", err);
    return NextResponse.json({ error: "Failed to combine concepts." }, { status: 500 });
  }
}
