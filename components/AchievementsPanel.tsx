"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Trophy, X } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { ACHIEVEMENTS, deriveState } from "@/lib/achievements";

export function AchievementsPanel() {
  const open = useGameStore((s) => s.achievementsOpen);
  const setOpen = useGameStore((s) => s.setAchievementsOpen);
  const unlocked = useGameStore((s) => s.achievements);
  const inventory = useGameStore((s) => s.inventory);
  const level = useGameStore((s) => s.level);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const have = new Set(unlocked);
  const state = deriveState(inventory, level);

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
            className="panel relative flex max-h-[80vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl"
            initial={{ scale: 0.94, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Trophy size={18} className="text-[var(--muted)]" />
                <h2 className="text-[15px] font-semibold tracking-tight">Achievements</h2>
                <span
                  className="tabnum rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: "var(--surface-3)", color: "var(--muted)" }}
                >
                  {have.size}/{ACHIEVEMENTS.length}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted transition hover:text-fg"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2">
              {ACHIEVEMENTS.map((a) => {
                const isUnlocked = have.has(a.key);
                const prog = a.progress?.(state);
                const pct = prog ? Math.min(1, prog.have / prog.need) : isUnlocked ? 1 : 0;
                return (
                  <div
                    key={a.key}
                    className="rounded-xl p-3"
                    style={{
                      background: "linear-gradient(180deg,var(--surface-2),var(--surface-1))",
                      border: `1px solid ${isUnlocked ? "#a78bfa55" : "var(--line)"}`,
                      opacity: isUnlocked ? 1 : 0.72,
                      boxShadow: isUnlocked ? "0 0 22px -12px #a78bfa" : undefined,
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          boxShadow: "inset 0 1px 0 0 var(--hi)",
                          color: isUnlocked ? "#c4b5fd" : "var(--faint)",
                        }}
                      >
                        {isUnlocked ? <a.icon size={18} /> : <Lock size={16} />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-tight">{a.title}</div>
                        <div className="mt-0.5 text-[11px] leading-snug text-muted">
                          {a.description}
                        </div>
                      </div>
                    </div>
                    {prog && !isUnlocked && (
                      <div className="mt-2.5">
                        <div className="h-1 overflow-hidden rounded-full bg-black/40">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct * 100}%`, background: "#a78bfa" }}
                          />
                        </div>
                        <div className="label mt-1 tabnum">
                          {Math.min(prog.have, prog.need)} / {prog.need}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
