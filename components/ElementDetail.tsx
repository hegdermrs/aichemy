"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Hammer, X } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { RARITY_META, type ConceptDTO } from "@/lib/types";

interface DetailResponse {
  concept: ConceptDTO;
  parents: { left: ConceptDTO; right: ConceptDTO } | null;
}

/**
 * Floating detail card for a single element. Driven by store.inspectId, so both
 * the canvas (tap a tile) and the graph (click a node) open the same thing.
 * Enriches with fresh discoverer / craft-count / parents from the server.
 */
export function ElementDetail() {
  const id = useGameStore((s) => s.inspectId);
  const setInspect = useGameStore((s) => s.setInspect);
  const inventory = useGameStore((s) => s.inventory);

  const [detail, setDetail] = useState<DetailResponse | null>(null);

  const local = id ? inventory.find((c) => c.id === id) ?? null : null;

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setInspect(null);
    window.addEventListener("keydown", onKey);
    let cancelled = false;
    setDetail(null);
    fetch(`/api/concept?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => !cancelled && d.concept && setDetail(d))
      .catch(() => {});
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [id, setInspect]);

  const concept = detail?.concept ?? local;
  const meta = concept ? RARITY_META[concept.rarity] : null;

  return (
    <AnimatePresence>
      {id && concept && meta && (
        <motion.div
          key={id}
          className="pointer-events-auto absolute left-4 top-20 z-40 w-[290px]"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
        >
          <div
            className="panel rounded-2xl p-4"
            style={{ borderColor: `${meta.color}55` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl text-2xl"
                  style={{
                    background: `radial-gradient(circle at 50% 25%, ${meta.color}33, rgba(0,0,0,0.4))`,
                    border: `1.5px solid ${meta.color}`,
                  }}
                >
                  {concept.emoji}
                </span>
                <div>
                  <div className="text-[15px] font-semibold leading-tight">{concept.name}</div>
                  <div className="label mt-1" style={{ color: meta.color }}>
                    {concept.category} · {meta.label}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspect(null)}
                className="-mr-1 -mt-1 p-1 text-muted transition hover:text-fg"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted">{concept.description}</p>

            {detail?.parents && (
              <div className="mt-3 flex items-center gap-1.5">
                <span className="label">Crafted from</span>
                <Pill c={detail.parents.left} />
                <span className="text-muted">+</span>
                <Pill c={detail.parents.right} />
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-2.5">
              <div className="label">
                {concept.firstDiscovererName ? (
                  <>
                    Discovered by{" "}
                    <span className="font-semibold text-fg">{concept.firstDiscovererName}</span>
                  </>
                ) : concept.isStarter ? (
                  "Starter element"
                ) : (
                  "Discoverer unknown"
                )}
              </div>
              <div className="label tabnum flex items-center gap-1" title="Global crafts">
                <Hammer size={11} /> {concept.craftCount}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Pill({ c }: { c: ConceptDTO }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]"
      style={{ background: "var(--surface-3)", border: "1px solid var(--line)" }}
    >
      <span>{c.emoji}</span>
      <span className="max-w-[80px] truncate">{c.name}</span>
    </span>
  );
}
