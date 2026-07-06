"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useGameStore } from "@/store/gameStore";

export function NameModal() {
  const open = useGameStore((s) => s.nameModalOpen);
  const playerName = useGameStore((s) => s.playerName);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const close = useGameStore((s) => s.closeNameModal);

  const [value, setValue] = useState("");

  // Prefill with the remembered name whenever the modal opens.
  useEffect(() => {
    if (open) setValue(playerName ?? "");
  }, [open, playerName]);

  const submit = () => {
    if (value.trim()) setPlayerName(value);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[60] grid place-items-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onPointerDown={close} />
          <motion.div
            className="panel relative w-full max-w-[380px] rounded-2xl p-5"
            initial={{ scale: 0.94, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            <div className="mb-2" style={{ color: "var(--accent)" }}>
              <Sparkles size={22} />
            </div>
            <h2 className="text-[16px] font-semibold tracking-tight">
              You discovered something new
            </h2>
            <p className="mt-1 text-sm text-muted">
              Add your name — you&apos;ll be credited as the first to discover this, and
              every future first discovery. Stored on this device only.
            </p>

            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") close();
              }}
              maxLength={40}
              placeholder="Your name"
              className="mt-4 w-full rounded-lg border border-[var(--line)] bg-black/25 px-3 py-2 text-sm outline-none placeholder:text-[var(--faint)] focus:border-[var(--accent)]"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={close} className="label px-3 py-2 hover:text-fg">
                Skip
              </button>
              <button
                onClick={submit}
                disabled={!value.trim()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] transition disabled:opacity-40"
                style={{ background: "var(--accent)" }}
              >
                Claim it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
