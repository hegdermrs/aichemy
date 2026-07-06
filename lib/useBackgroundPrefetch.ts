"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { prefetchPairs, shuffle } from "@/lib/client-api";

/**
 * Continuously pre-generates uncrafted pairs from the player's inventory
 * in the background so future crafts are instant (cache hits, not AI calls).
 *
 * Picks 20 random uncrafted pairs every 10 seconds — the server de-dupes
 * already-cached pairs, so sending the same pair twice costs nothing.
 */
export function useBackgroundPrefetch() {
  const inventory = useGameStore((s) => s.inventory);
  const lastTick = useRef(0);

  useEffect(() => {
    if (inventory.length < 3) return;

    const interval = setInterval(() => {
      // Only run if more than 10s since last tick
      if (Date.now() - lastTick.current < 10_000) return;
      lastTick.current = Date.now();

      // Build pairs from a shuffled sample (up to ~14 concepts → ~91 pairs, capped)
      const sample = shuffle(inventory).slice(0, 14);
      const pairs: { leftId: string; rightId: string }[] = [];
      for (let i = 0; i < sample.length; i++) {
        for (let j = i + 1; j < sample.length; j++) {
          pairs.push({ leftId: sample[i].id, rightId: sample[j].id });
        }
      }

      if (pairs.length > 0) {
        // Shuffle and take a batch so we don't flood the queue
        const batch = shuffle(pairs).slice(0, 20);
        prefetchPairs(batch);
      }
    }, 8_000);

    return () => clearInterval(interval);
  }, [inventory]);
}
