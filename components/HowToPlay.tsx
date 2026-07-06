"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  HelpCircle,
  X,
  Hand,
  ArrowRightLeft,
  Sparkles,
  Eye,
  Star,
  Trophy,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { useGameStore } from "@/store/gameStore";

const STEPS = [
  {
    icon: Hand,
    title: "Draw a card",
    body: "Tap or drag any element from your inventory panel on the right to place it onto the canvas.",
  },
  {
    icon: ArrowRightLeft,
    title: "Combine two cards",
    body: "Drag one canvas card and drop it onto another. Overlapping cards combine to create something new.",
  },
  {
    icon: Sparkles,
    title: "Discover new elements",
    body: "Every combination is permanent — the same two inputs will always produce the same result, for everyone, forever.",
  },
  {
    icon: Eye,
    title: "Inspect an element",
    body: "Tap any card on the canvas to see its description, rarity, who discovered it, and what it was crafted from.",
  },
  {
    icon: TrendingUp,
    title: "Rarity & leveling",
    body: "Elements range from Common to Legendary. Unlocking rarer elements earns more XP and levels you up.",
  },
  {
    icon: Star,
    title: "Be the first discoverer",
    body: "If you are the first person ever to create an element, your name is attached to it for everyone to see.",
  },
  {
    icon: Trophy,
    title: "Earn achievements",
    body: "Complete milestones like discovering your first Rare element or unlocking 50 concepts to earn badges.",
  },
  {
    icon: BarChart3,
    title: "Track your progress",
    body: "Open Stats to see your collection breakdown, and switch to Graph view to explore how elements connect.",
  },
];

export function HowToPlay() {
  const open = useGameStore((s) => s.howToPlayOpen);
  const setOpen = useGameStore((s) => s.setHowToPlayOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

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
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <HelpCircle size={18} className="text-[var(--muted)]" />
                <h2 className="text-[15px] font-semibold tracking-tight">How to Play</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-muted transition hover:text-fg"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            {/* Steps */}
            <div className="overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                {STEPS.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div
                      className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                      style={{
                        background: "linear-gradient(180deg,var(--surface-3),var(--surface-1))",
                        border: "1px solid var(--line)",
                        boxShadow: "inset 0 1px 0 0 var(--hi)",
                      }}
                    >
                      <step.icon size={17} className="text-[var(--muted)]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{step.title}</h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer tip */}
              <div
                className="mt-5 rounded-xl px-4 py-3"
                style={{
                  background: "linear-gradient(135deg,rgba(250,204,21,0.08),rgba(250,204,21,0.02))",
                  border: "1px solid rgba(250,204,21,0.18)",
                }}
              >
                <p className="text-xs leading-relaxed text-muted">
                  <span className="font-semibold text-fg">Tip:</span> All combinations are powered
                  by AI and cached forever. The same two elements will always give the same result —
                  so every discovery you make helps everyone else too.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
