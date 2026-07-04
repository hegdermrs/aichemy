// Pair normalization — the foundation of recipe permanence.
//
// A combination is order-independent: "LLM + Memory" and "Memory + LLM" must
// resolve to the same recipe. We normalize by sorting the two concept names
// case-insensitively and joining with a separator that cannot appear in a name.

const SEP = "|";

export function normalizePair(a: string, b: string): {
  key: string;
  first: string;
  second: string;
} {
  const left = a.trim();
  const right = b.trim();
  const [first, second] =
    left.toLowerCase() <= right.toLowerCase() ? [left, right] : [right, left];
  return { key: `${first}${SEP}${second}`, first, second };
}

export function redisPairKey(pairKey: string): string {
  return `recipe:${pairKey}`;
}
