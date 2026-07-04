"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { RARITY_META } from "@/lib/types";

export function DiscoveryToast() {
  const last = useGameStore((s) => s.lastDiscovery);
  const dismiss = useGameStore((s) => s.dismissDiscovery);

  useEffect(() => {
    if (!last) return;
    const t = setTimeout(dismiss, last.isFirstCraft ? 3400 : 2200);
    return () => clearTimeout(t);
  }, [last, dismiss]);

  return (
    <AnimatePresence>
      {last && (
        <motion.div
          key={last.at}
          className="pointer-events-none absolute left-1/2 top-20 z-40 -translate-x-1/2"
          initial={{ opacity: 0, y: -14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          <div
            className="panel flex items-center gap-3 rounded-xl py-2.5 pl-2.5 pr-4"
            style={{ borderColor: `${RARITY_META[last.concept.rarity].color}55` }}
          >
            <span
              className="grid h-10 w-10 place-items-center rounded-lg text-xl"
              style={{
                background: "rgba(0,0,0,0.3)",
                boxShadow: `inset 0 1px 0 0 var(--hi), 0 0 20px -6px ${RARITY_META[last.concept.rarity].glow}`,
              }}
            >
              {last.concept.emoji}
            </span>
            <div className="leading-tight">
              <div className="label" style={{ color: RARITY_META[last.concept.rarity].color }}>
                {last.isNewDiscovery
                  ? last.isFirstCraft
                    ? "First transmutation"
                    : "New element"
                  : "Transmuted"}
              </div>
              <div className="mt-0.5 text-[15px] font-semibold">{last.concept.name}</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
