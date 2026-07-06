"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { ACH_BY_KEY } from "@/lib/achievements";

const ACCENT = "#a78bfa";

export function AchievementToast() {
  const key = useGameStore((s) => s.achievementQueue[0]);
  const dismiss = useGameStore((s) => s.dismissAchievement);
  const ach = key ? ACH_BY_KEY[key] : undefined;

  useEffect(() => {
    if (!key) return;
    const t = setTimeout(dismiss, 3200);
    return () => clearTimeout(t);
  }, [key, dismiss]);

  return (
    <AnimatePresence mode="wait">
      {ach && (
        <motion.div
          key={key}
          className="pointer-events-none absolute bottom-28 left-1/2 z-40 -translate-x-1/2"
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
        >
          <div
            className="panel flex items-center gap-3 rounded-2xl py-2.5 pl-3 pr-5"
            style={{
              borderColor: `${ACCENT}66`,
              boxShadow: `inset 0 1px 0 0 var(--hi), 0 0 34px -10px ${ACCENT}, 0 12px 34px -18px rgba(0,0,0,0.9)`,
            }}
          >
            <motion.span
              className="grid h-11 w-11 place-items-center rounded-xl"
              style={{
                background: `radial-gradient(circle at 50% 30%, ${ACCENT}44, rgba(0,0,0,0.4))`,
                border: `1.5px solid ${ACCENT}`,
                color: "#ddd6fe",
              }}
              initial={{ rotate: -8, scale: 0.6 }}
              animate={{ rotate: 0, scale: [0.6, 1.15, 1] }}
              transition={{ duration: 0.55, ease: "backOut" }}
            >
              <ach.icon size={22} />
            </motion.span>
            <div className="leading-tight">
              <div className="label flex items-center gap-1" style={{ color: ACCENT }}>
                <Trophy size={11} /> Achievement unlocked
              </div>
              <div className="mt-0.5 text-[15px] font-semibold">{ach.title}</div>
              <div className="label mt-0.5 normal-case tracking-normal text-muted">
                {ach.description}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
