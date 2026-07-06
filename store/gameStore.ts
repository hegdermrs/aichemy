"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { ConceptDTO, CombineResult } from "@/lib/types";
import { levelFromXp, rankForLevel, totalXp } from "@/lib/leveling";
import { prefetchPairs, shuffle } from "@/lib/client-api";
import { deriveState, evaluate } from "@/lib/achievements";

export interface CanvasItem {
  instanceId: string;
  concept: ConceptDTO;
  x: number;
  y: number;
  // Transient UI state (not persisted).
  busy?: boolean; // mid-merge: converging toward the merge point
  mergeX?: number;
  mergeY?: number;
  justCrafted?: boolean; // freshly produced: play the pop/burst
}

export interface DiscoveryEvent {
  concept: ConceptDTO;
  isNewDiscovery: boolean;
  isFirstCraft: boolean;
  source: CombineResult["source"];
  at: number;
}

export interface LevelUpEvent {
  level: number;
  rank: string;
  at: number;
}

export interface TimelineEntry {
  id: string;
  name: string;
  emoji: string;
  rarity: ConceptDTO["rarity"];
  isFirstCraft: boolean;
  at: number;
}

interface GameState {
  hydrated: boolean;
  inventory: ConceptDTO[]; // unique unlocked concepts
  canvas: CanvasItem[];
  discoveredIds: string[];
  lastDiscovery: DiscoveryEvent | null;
  combining: boolean;
  level: number;
  levelUp: LevelUpEvent | null;
  view: "board" | "graph";
  achievements: string[]; // unlocked achievement keys
  achievementQueue: string[]; // keys waiting to be shown as a pop-up
  achievementsOpen: boolean;
  timeline: TimelineEntry[]; // personal discovery log, newest last
  statsOpen: boolean;
  playerName: string | null; // browser-remembered discoverer name (no login)
  nameModalOpen: boolean;
  pendingAttributionId: string | null; // concept awaiting a first-time name
  inspectId: string | null; // concept whose detail card is open

  init: (starters: ConceptDTO[]) => void;
  setView: (view: "board" | "graph") => void;
  checkAchievements: (silent: boolean) => void;
  dismissAchievement: () => void;
  setAchievementsOpen: (open: boolean) => void;
  setStatsOpen: (open: boolean) => void;
  setPlayerName: (name: string) => void;
  closeNameModal: () => void;
  setInspect: (id: string | null) => void;
  spawnCard: (concept: ConceptDTO, x: number, y: number) => void;
  moveCard: (instanceId: string, x: number, y: number) => void;
  removeCard: (instanceId: string) => void;
  clearCanvas: () => void;
  combineOnCanvas: (aId: string, bId: string) => Promise<void>;
  dismissDiscovery: () => void;
  syncLevel: (silent: boolean) => void;
  dismissLevelUp: () => void;
}

function addUnique(list: ConceptDTO[], concept: ConceptDTO): ConceptDTO[] {
  if (list.some((c) => c.id === concept.id)) return list;
  return [...list, concept];
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      inventory: [],
      canvas: [],
      discoveredIds: [],
      lastDiscovery: null,
      combining: false,
      level: 1,
      levelUp: null,
      view: "board",
      achievements: [],
      achievementQueue: [],
      achievementsOpen: false,
      timeline: [],
      statsOpen: false,
      playerName: null,
      nameModalOpen: false,
      pendingAttributionId: null,
      inspectId: null,

      setView: (view) => set({ view }),
      setAchievementsOpen: (open) => set({ achievementsOpen: open }),
      setStatsOpen: (open) => set({ statsOpen: open }),
      setInspect: (id) => set({ inspectId: id }),
      closeNameModal: () => set({ nameModalOpen: false, pendingAttributionId: null }),

      setPlayerName: (name) => {
        const trimmed = name.trim().slice(0, 40);
        if (!trimmed) return;
        const pending = get().pendingAttributionId;
        set({ playerName: trimmed, nameModalOpen: false, pendingAttributionId: null });
        // Backfill the discovery that triggered the prompt.
        if (pending) {
          fetch("/api/attribute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conceptId: pending, name: trimmed }),
          }).catch(() => {});
        }
      },

      init: (starters) => {
        // Merge starters into whatever the player already has.
        set((s) => {
          let inv = s.inventory;
          for (const c of starters) inv = addUnique(inv, c);
          return { inventory: inv };
        });
        // Establish baselines silently — no pop-ups on load/reload.
        get().syncLevel(true);
        get().checkAchievements(true);
      },

      checkAchievements: (silent) => {
        const satisfied = evaluate(deriveState(get().inventory, get().level));
        const have = new Set(get().achievements);
        const newly = satisfied.filter((k) => !have.has(k));
        if (newly.length === 0) return;
        set((s) => ({
          achievements: [...s.achievements, ...newly],
          achievementQueue: silent ? s.achievementQueue : [...s.achievementQueue, ...newly],
        }));
      },

      dismissAchievement: () =>
        set((s) => ({ achievementQueue: s.achievementQueue.slice(1) })),

      syncLevel: (silent) => {
        const { level } = levelFromXp(totalXp(get().inventory));
        const prev = get().level;
        if (level === prev) return;
        if (level > prev && !silent) {
          set({ level, levelUp: { level, rank: rankForLevel(level), at: Date.now() } });
        } else {
          set({ level });
        }
      },

      dismissLevelUp: () => set({ levelUp: null }),

      spawnCard: (concept, x, y) =>
        set((s) => ({
          canvas: [...s.canvas, { instanceId: nanoid(8), concept, x, y }],
        })),

      moveCard: (instanceId, x, y) =>
        set((s) => ({
          canvas: s.canvas.map((it) =>
            it.instanceId === instanceId ? { ...it, x, y } : it,
          ),
        })),

      removeCard: (instanceId) =>
        set((s) => ({ canvas: s.canvas.filter((it) => it.instanceId !== instanceId) })),

      clearCanvas: () => set({ canvas: [] }),

      combineOnCanvas: async (aId, bId) => {
        const state = get();
        const a = state.canvas.find((c) => c.instanceId === aId);
        const b = state.canvas.find((c) => c.instanceId === bId);
        if (!a || !b || a.busy || b.busy) return;
        const inventoryBefore = state.inventory;

        const mergeX = (a.x + b.x) / 2;
        const mergeY = (a.y + b.y) / 2;

        // Both cards drift toward the merge point and pulse while we resolve.
        set((s) => ({
          combining: true,
          canvas: s.canvas.map((it) =>
            it.instanceId === aId || it.instanceId === bId
              ? { ...it, busy: true, mergeX, mergeY }
              : it,
          ),
        }));

        // Floor the animation so a fast cache hit still feels like a merge.
        const minAnim = new Promise((r) => setTimeout(r, 380));

        try {
          const request = fetch("/api/combine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leftId: a.concept.id,
              rightId: b.concept.id,
              discovererName: get().playerName ?? undefined,
            }),
          }).then(async (res) => {
            if (!res.ok) throw new Error(`combine failed: ${res.status}`);
            return (await res.json()) as CombineResult;
          });

          const [data] = await Promise.all([request, minAnim]);
          const newId = nanoid(8);

          set((s) => ({
            combining: false,
            inventory: addUnique(s.inventory, data.result),
            discoveredIds: s.discoveredIds.includes(data.result.id)
              ? s.discoveredIds
              : [...s.discoveredIds, data.result.id],
            canvas: [
              ...s.canvas.filter(
                (it) => it.instanceId !== aId && it.instanceId !== bId,
              ),
              { instanceId: newId, concept: data.result, x: mergeX, y: mergeY, justCrafted: true },
            ],
            lastDiscovery: {
              concept: data.result,
              isNewDiscovery: data.isNewDiscovery,
              isFirstCraft: data.isFirstCraft,
              source: data.source,
              at: Date.now(),
            },
          }));

          // A newly unlocked concept may have pushed us over a level threshold
          // and/or satisfied achievements.
          get().syncLevel(false);
          get().checkAchievements(false);

          // If this element is new to the player, record it on the timeline and
          // speculatively pre-generate it against a sample of their inventory so
          // the next crafts are instant.
          const isNewToPlayer = !inventoryBefore.some((c) => c.id === data.result.id);
          if (isNewToPlayer) {
            set((s) => ({
              timeline: [
                ...s.timeline.slice(-249),
                {
                  id: data.result.id,
                  name: data.result.name,
                  emoji: data.result.emoji,
                  rarity: data.result.rarity,
                  isFirstCraft: data.isFirstCraft,
                  at: Date.now(),
                },
              ],
            }));
            const others = shuffle(inventoryBefore).slice(0, 10);
            prefetchPairs(others.map((c) => ({ leftId: data.result.id, rightId: c.id })));

            // First time this player is the *global* first discoverer and hasn't
            // named themselves yet → ask once, then remember + attribute.
            if (data.isNewDiscovery && !get().playerName) {
              set({ nameModalOpen: true, pendingAttributionId: data.result.id });
            }
          }

          // Let the burst play, then settle to a resting tile.
          setTimeout(() => {
            set((s) => ({
              canvas: s.canvas.map((it) =>
                it.instanceId === newId ? { ...it, justCrafted: false } : it,
              ),
            }));
          }, 850);
        } catch (err) {
          console.error(err);
          // Release the cards so the player can retry.
          set((s) => ({
            combining: false,
            canvas: s.canvas.map((it) =>
              it.instanceId === aId || it.instanceId === bId
                ? { ...it, busy: false, mergeX: undefined, mergeY: undefined }
                : it,
            ),
          }));
        }
      },

      dismissDiscovery: () => set({ lastDiscovery: null }),
    }),
    {
      name: "infinite-ai-craft",
      partialize: (s) => ({
        inventory: s.inventory,
        // Persist only resting position/identity, never transient merge flags.
        canvas: s.canvas.map(({ instanceId, concept, x, y }) => ({
          instanceId,
          concept,
          x,
          y,
        })),
        discoveredIds: s.discoveredIds,
        achievements: s.achievements,
        timeline: s.timeline,
        playerName: s.playerName,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
