"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";

const GOLD = "#fbbf24";

export function LevelUpToast() {
  const levelUp = useGameStore((s) => s.levelUp);
  const dismiss = useGameStore((s) => s.dismissLevelUp);

  useEffect(() => {
    if (!levelUp) return;
    const t = setTimeout(dismiss, 3400);
    return () => clearTimeout(t);
  }, [levelUp, dismiss]);

  return (
    <AnimatePresence>
      {levelUp && (
        <motion.div
          key={levelUp.at}
          className="pointer-events-none absolute bottom-10 left-1/2 z-40 -translate-x-1/2"
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <Burst />
          <div
            className="panel relative flex items-center gap-3.5 rounded-2xl py-3 pl-3 pr-5"
            style={{
              borderColor: `${GOLD}66`,
              boxShadow: `inset 0 1px 0 0 var(--hi), 0 0 44px -8px ${GOLD}, 0 14px 40px -18px rgba(0,0,0,0.9)`,
            }}
          >
            <motion.span
              className="tabnum grid h-12 w-12 place-items-center rounded-xl text-xl font-bold"
              style={{
                background: `radial-gradient(circle at 50% 30%, ${GOLD}44, rgba(0,0,0,0.4))`,
                border: `1.5px solid ${GOLD}`,
                color: GOLD,
              }}
              initial={{ rotate: -8, scale: 0.6 }}
              animate={{ rotate: 0, scale: [0.6, 1.18, 1] }}
              transition={{ duration: 0.6, ease: "backOut" }}
            >
              {levelUp.level}
            </motion.span>
            <div className="leading-tight">
              <div className="label" style={{ color: GOLD }}>
                Level up
              </div>
              <div className="text-[17px] font-semibold tracking-tight">
                Level {levelUp.level}
              </div>
              <div className="label mt-0.5">Rank · {levelUp.rank}</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Burst() {
  const bits = Array.from({ length: 18 });
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      {bits.map((_, i) => {
        const angle = (i / bits.length) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 70 + Math.random() * 70;
        return (
          <motion.span
            key={i}
            className="absolute rounded-[1px]"
            style={{
              width: 3 + Math.random() * 3,
              height: 3 + Math.random() * 6,
              background: GOLD,
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist - 20,
              opacity: 0,
              rotate: Math.random() * 320,
            }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
