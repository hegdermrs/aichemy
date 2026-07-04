"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { prefetchPairs } from "@/lib/client-api";
import { CanvasCard } from "./CanvasCard";

function overlapArea(a: DOMRect, b: DOMRect): number {
  const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return w * h;
}

export function InfiniteCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvas = useGameStore((s) => s.canvas);
  const moveCard = useGameStore((s) => s.moveCard);
  const removeCard = useGameStore((s) => s.removeCard);
  const combineOnCanvas = useGameStore((s) => s.combineOnCanvas);

  const draggingId = useRef<string | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  // Pairs already primed during the current drag, so we prefetch each once.
  const primedThisDrag = useRef<Set<string>>(new Set());

  // Find the card the dragged one is most overlapping (past a ~30% threshold).
  const findTarget = useCallback((sourceId: string): string | null => {
    const container = containerRef.current;
    if (!container) return null;
    const src = container.querySelector<HTMLElement>(`[data-canvas-card="${sourceId}"]`);
    if (!src) return null;
    const sr = src.getBoundingClientRect();
    const threshold = sr.width * sr.height * 0.3;

    let best: { id: string; area: number } | null = null;
    container.querySelectorAll<HTMLElement>("[data-canvas-card]").forEach((el) => {
      const id = el.dataset.canvasCard!;
      if (id === sourceId) return;
      const area = overlapArea(sr, el.getBoundingClientRect());
      if (area >= threshold && (!best || area > best.area)) best = { id, area };
    });
    return best ? (best as { id: string; area: number }).id : null;
  }, []);

  const handleDragStart = useCallback((id: string) => {
    draggingId.current = id;
    primedThisDrag.current.clear();
  }, []);

  const handleDragMove = useCallback(
    (id: string) => {
      const target = findTarget(id);
      setHoverTargetId((prev) => (prev === target ? prev : target));

      // The moment we know which pair is about to be crafted, start generating
      // it in the background so the drop resolves instantly (or near-instantly).
      if (target) {
        const src = canvas.find((c) => c.instanceId === id)?.concept.id;
        const tgt = canvas.find((c) => c.instanceId === target)?.concept.id;
        if (src && tgt) {
          const key = [src, tgt].sort().join("|");
          if (!primedThisDrag.current.has(key)) {
            primedThisDrag.current.add(key);
            prefetchPairs([{ leftId: src, rightId: tgt }]);
          }
        }
      }
    },
    [findTarget, canvas],
  );

  const handleDragEnd = useCallback(
    (id: string) => {
      const target = findTarget(id);
      draggingId.current = null;
      setHoverTargetId(null);
      if (target) void combineOnCanvas(target, id);
    },
    [findTarget, combineOnCanvas],
  );

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <div className="workspace-bg" />
      <AnimatePresence>
        {canvas.map((item) => (
          <CanvasCard
            key={item.instanceId}
            item={item}
            isHoverTarget={hoverTargetId === item.instanceId}
            onDragStartCard={handleDragStart}
            onDragMoveCard={handleDragMove}
            onDragEndCard={handleDragEnd}
            onMove={moveCard}
            onRemove={removeCard}
          />
        ))}
      </AnimatePresence>

      {canvas.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[15px] font-medium text-fg/75">The crucible is empty</p>
            <p className="label mt-2">
              Draw an element from your inventory · drop one onto another to transmute
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
