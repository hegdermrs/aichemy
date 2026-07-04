// Client-side helpers for fire-and-forget background prefetching.

export interface IdPair {
  leftId: string;
  rightId: string;
}

/** Ask the server to background-generate these pairs. Never awaited. */
export function prefetchPairs(pairs: IdPair[]): void {
  const cleaned = pairs.filter((p) => p.leftId && p.rightId && p.leftId !== p.rightId);
  if (cleaned.length === 0) return;
  fetch("/api/prefetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairs: cleaned.slice(0, 40) }),
    keepalive: true,
  }).catch(() => {
    /* best-effort */
  });
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
