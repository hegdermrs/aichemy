"use client";

import { useGameStore } from "@/store/gameStore";

export function TopBar() {
  const clearCanvas = useGameStore((s) => s.clearCanvas);
  const canvasCount = useGameStore((s) => s.canvas.length);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-5 py-4">
      <div className="pointer-events-auto flex items-center gap-3">
        <div
          className="grid h-9 w-9 place-items-center rounded-lg text-base"
          style={{
            background: "linear-gradient(180deg,var(--surface-3),var(--surface-1))",
            border: "1px solid var(--line)",
            boxShadow: "inset 0 1px 0 0 var(--hi)",
          }}
        >
          ⚗
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

      <button
        onClick={clearCanvas}
        disabled={canvasCount === 0}
        className="panel label pointer-events-auto ml-1 rounded-lg px-3.5 py-2 transition hover:text-fg disabled:opacity-35"
      >
        Clear crucible
      </button>
    </header>
  );
}
