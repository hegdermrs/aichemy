// Background pre-generation queue.
//
// Speculatively primes likely-to-be-crafted pairs so a first discovery is
// already cached by the time the player drops the tiles. Concurrency is kept
// low so we don't hammer the model API (each cold generation costs tokens).
//
// NOTE: this is an in-process queue — fine for a long-running Node server.
// On serverless (Vercel), move this to a durable queue (e.g. Upstash QStash)
// since work after the response returns isn't guaranteed to run.
import { prime } from "./combine";

export interface PrefetchPair {
  leftId: string;
  rightId: string;
}

const MAX_CONCURRENT = 2;
const queue: PrefetchPair[] = [];
const seen = new Set<string>(); // pairs currently queued or running
let active = 0;

function keyOf(p: PrefetchPair): string {
  return [p.leftId, p.rightId].sort().join("|");
}

export function enqueuePrefetch(pairs: PrefetchPair[]): number {
  let added = 0;
  for (const p of pairs) {
    if (p.leftId === p.rightId) continue;
    const key = keyOf(p);
    if (seen.has(key)) continue;
    seen.add(key);
    queue.push(p);
    added += 1;
  }
  pump();
  return added;
}

function pump(): void {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift()!;
    active += 1;
    prime(job.leftId, job.rightId)
      .catch(() => {
        /* prefetch is best-effort */
      })
      .finally(() => {
        active -= 1;
        seen.delete(keyOf(job));
        pump();
      });
  }
}
