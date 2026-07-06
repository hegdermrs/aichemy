"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { TopBar } from "@/components/TopBar";
import { InfiniteCanvas } from "@/components/InfiniteCanvas";
import { GraphView } from "@/components/GraphView";
import { Inventory } from "@/components/Inventory";
import { DiscoveryToast } from "@/components/DiscoveryToast";
import { LevelUpToast } from "@/components/LevelUpToast";
import { AchievementToast } from "@/components/AchievementToast";
import { AchievementsPanel } from "@/components/AchievementsPanel";
import { StatsPanel } from "@/components/StatsPanel";
import { NameModal } from "@/components/NameModal";
import { ElementDetail } from "@/components/ElementDetail";
import { HowToPlay } from "@/components/HowToPlay";
import { useBackgroundPrefetch } from "@/lib/useBackgroundPrefetch";
import { prefetchPairs } from "@/lib/client-api";
import type { ConceptDTO } from "@/lib/types";

// Warm every pairwise combination of the starter elements once, so the opening
// moves of the game are already cached for everyone.
function warmStarterPairs(starters: ConceptDTO[]) {
  const pairs = [];
  for (let i = 0; i < starters.length; i++) {
    for (let j = i + 1; j < starters.length; j++) {
      pairs.push({ leftId: starters[i].id, rightId: starters[j].id });
    }
  }
  prefetchPairs(pairs);
}

export default function Home() {
  const init = useGameStore((s) => s.init);
  const view = useGameStore((s) => s.view);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Zustand persist rehydrates asynchronously; wait a tick so we don't render
    // an empty store on first paint, then merge in the starter concepts.
    (async () => {
      try {
        const res = await fetch("/api/concepts");
        const data = (await res.json()) as { concepts: ConceptDTO[] };
        if (!cancelled) {
          init(data.concepts);
          warmStarterPairs(data.concepts);
        }
      } catch (err) {
        console.error("Failed to load starter concepts:", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [init]);

  useBackgroundPrefetch();

  return (
    <main className="relative h-dvh w-screen overflow-hidden">
      {view === "graph" ? <GraphView /> : <InfiniteCanvas />}
      <TopBar />
      <DiscoveryToast />
      <LevelUpToast />
      <AchievementToast />
      <AchievementsPanel />
      <StatsPanel />
      <ElementDetail />
      <HowToPlay />
      <NameModal />
      {view === "board" && <Inventory />}
      {!ready && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-[var(--bg)]">
          <div className="animate-pulse text-sm text-muted">Loading concepts…</div>
        </div>
      )}
    </main>
  );
}
