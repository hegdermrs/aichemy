"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
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
  const clearCanvas = useGameStore((s) => s.clearCanvas);
  const setInspect = useGameStore((s) => s.setInspect);
  const inventoryHoverTarget = useGameStore((s) => s.hoverTargetId);

  const draggingId = useRef<string | null>(null);
  const [localHoverTargetId, setLocalHoverTargetId] = useState<string | null>(null);
  // Merged: canvas-to-canvas drag target OR inventory-to-canvas drag target.
  const hoverTargetId = localHoverTargetId ?? inventoryHoverTarget;
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
      setLocalHoverTargetId((prev) => (prev === target ? prev : target));

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
      setLocalHoverTargetId(null);
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
            onInspect={setInspect}
          />
        ))}
      </AnimatePresence>

      {canvas.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[15px] font-medium text-fg/75">The canvas is empty</p>
            <p className="label mt-2">
              Drag an element from inventory onto the canvas to begin
            </p>
          </div>
        </div>
      )}

      {/* Prominent destructive action, out on its own. */}
      {canvas.length > 0 && (
        <button
          onClick={clearCanvas}
          className="pointer-events-auto absolute bottom-5 left-5 z-30 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition"
          style={{
            background: "linear-gradient(180deg,#f0553f,#dc2626)",
            border: "1px solid #f87171",
            boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.2), 0 8px 22px -8px rgba(220,38,38,0.6)",
          }}
        >
          <Trash2 size={15} />
          Clear canvas
        </button>
      )}
    </div>
  );
}
