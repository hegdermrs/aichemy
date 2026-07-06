"use client";

import { BarChart3, FlaskConical, Trophy } from "lucide-react";
import { useGameStore } from "@/store/gameStore";

export function TopBar() {
  const view = useGameStore((s) => s.view);
  const setView = useGameStore((s) => s.setView);
  const setAchievementsOpen = useGameStore((s) => s.setAchievementsOpen);
  const setStatsOpen = useGameStore((s) => s.setStatsOpen);
  const unlockedCount = useGameStore((s) => s.achievements.length);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-5 py-4">
      <div className="pointer-events-auto flex items-center gap-3">
        <div
          className="grid h-9 w-9 place-items-center rounded-lg"
          style={{
            background: "linear-gradient(180deg,var(--surface-3),var(--surface-1))",
            border: "1px solid var(--line)",
            boxShadow: "inset 0 1px 0 0 var(--hi)",
            color: "#f5b942",
          }}
        >
          <FlaskConical size={18} />
        </div>
        <h1 className="text-[16px] font-semibold tracking-tight">
          <span
            style={{
              background: "linear-gradient(180deg,#fde68a,#f59e0b)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            AI
          </span>
          chemy
        </h1>
      </div>

      {/* Board / Graph toggle */}
      <div className="panel pointer-events-auto ml-1 flex items-center gap-0.5 rounded-lg p-0.5">
        {(["board", "graph"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="label rounded-md px-2.5 py-1.5 capitalize transition"
            style={
              view === v
                ? { background: "var(--surface-3)", color: "var(--fg)" }
                : { color: "var(--muted)" }
            }
          >
            {v === "board" ? "Canvas" : "Graph"}
          </button>
        ))}
      </div>

      <button
        onClick={() => setStatsOpen(true)}
        className="panel pointer-events-auto rounded-lg px-3 py-2 text-muted transition hover:text-fg"
        aria-label="Stats"
      >
        <BarChart3 size={16} />
      </button>

      <button
        onClick={() => setAchievementsOpen(true)}
        className="panel pointer-events-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-muted transition hover:text-fg"
        aria-label="Achievements"
      >
        <Trophy size={16} />
        <span className="tabnum label">{unlockedCount}</span>
      </button>
    </header>
  );
}
