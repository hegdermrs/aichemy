"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, X } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { levelFromXp, rankForLevel, totalXp } from "@/lib/leveling";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { RARITY_META, type ConceptDTO } from "@/lib/types";

interface StatsResponse {
  totalConcepts: number;
  totalRecipes: number;
  metrics: {
    total: number;
    cacheHitRate: number;
    avgMs: number;
    prefetchQueued: number;
    prefetchGenerated: number;
  };
  mostCrafted: ConceptDTO | null;
  rarest: ConceptDTO | null;
}

export function StatsPanel() {
  const open = useGameStore((s) => s.statsOpen);
  const setOpen = useGameStore((s) => s.setStatsOpen);
  const inventory = useGameStore((s) => s.inventory);
  const achievements = useGameStore((s) => s.achievements);
  const timeline = useGameStore((s) => s.timeline);

  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    let cancelled = false;
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => !cancelled && setStats(d))
      .catch(() => {});
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  const local = useMemo(() => {
    const discovered = inventory.filter((c) => !c.isStarter).length;
    const lvl = levelFromXp(totalXp(inventory));
    return { discovered, level: lvl.level, rank: rankForLevel(lvl.level) };
  }, [inventory]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50 grid place-items-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <motion.div
            className="panel relative flex max-h-[82vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl"
            initial={{ scale: 0.94, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <BarChart3 size={18} className="text-[var(--muted)]" />
                <h2 className="text-[15px] font-semibold tracking-tight">Stats</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted transition hover:text-fg"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              {/* Stat grid */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label="Discovered" value={local.discovered} />
                <Stat label="Level" value={`${local.level} · ${local.rank}`} />
                <Stat label="Achievements" value={`${achievements.length}/${ACHIEVEMENTS.length}`} />
                <Stat label="Global elements" value={stats?.totalConcepts ?? "…"} />
                <Stat label="Global recipes" value={stats?.totalRecipes ?? "…"} />
                <Stat
                  label="Cache hit rate"
                  value={stats ? `${Math.round(stats.metrics.cacheHitRate * 100)}%` : "…"}
                />
                <Stat
                  label="Avg response"
                  value={stats ? `${stats.metrics.avgMs}ms` : "…"}
                />
                <Stat
                  label="Pre-generated"
                  value={stats?.metrics.prefetchGenerated ?? "…"}
                  hint="background fan-out"
                />
                <Stat label="Most crafted" value={stats?.mostCrafted?.name ?? "—"} />
              </div>

              {/* Timeline */}
              <div className="label mt-5 mb-2">Discovery timeline</div>
              {timeline.length === 0 ? (
                <p className="py-4 text-sm text-muted">
                  Nothing yet — transmute two elements to begin your log.
                </p>
              ) : (
                <div className="flex flex-col">
                  {[...timeline].reverse().map((e, i, arr) => {
                    const showDay =
                      i === 0 || dayKey(e.at) !== dayKey(arr[i - 1].at);
                    const meta = RARITY_META[e.rarity];
                    return (
                      <div key={`${e.id}-${e.at}`}>
                        {showDay && (
                          <div className="label mb-1 mt-3 first:mt-0">{dayLabel(e.at)}</div>
                        )}
                        <div className="flex items-center gap-3 py-1.5">
                          <span className="tabnum w-12 shrink-0 text-[11px] text-faint">
                            {timeLabel(e.at)}
                          </span>
                          <span
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm"
                            style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${meta.color}55` }}
                          >
                            {e.emoji}
                          </span>
                          <span className="truncate text-[13px] font-medium">{e.name}</span>
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: meta.color }}
                            title={meta.label}
                          />
                          {e.isFirstCraft && (
                            <span
                              className="label ml-auto shrink-0 rounded-full px-1.5 py-0.5"
                              style={{ background: "#fbbf2422", color: "#fbbf24" }}
                            >
                              First
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "linear-gradient(180deg,var(--surface-2),var(--surface-1))",
        border: "1px solid var(--line)",
      }}
    >
      <div className="tabnum truncate text-[17px] font-semibold leading-tight">{value}</div>
      <div className="label mt-1.5">{label}</div>
      {hint && <div className="label mt-0.5 opacity-60">{hint}</div>}
    </div>
  );
}

function dayKey(ts: number): string {
  return new Date(ts).toDateString();
}
function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
