"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { useEffect, useRef } from "react";
import type { CanvasItem } from "@/store/gameStore";
import { RARITY_META } from "@/lib/types";
import { ConceptCardFace } from "./ConceptCardFace";

export function CanvasCard({
  item,
  isHoverTarget,
  onDragStartCard,
  onDragMoveCard,
  onDragEndCard,
  onMove,
  onRemove,
  onInspect,
}: {
  item: CanvasItem;
  isHoverTarget: boolean;
  onDragStartCard: (id: string) => void;
  onDragMoveCard: (id: string) => void;
  onDragEndCard: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  onInspect: (conceptId: string) => void;
}) {
  const x = useMotionValue(item.x);
  const y = useMotionValue(item.y);
  const dragging = useRef(false);
  const meta = RARITY_META[item.concept.rarity];

  // Sync from store when repositioned externally (but never mid-drag).
  useEffect(() => {
    if (dragging.current) return;
    x.set(item.x);
    y.set(item.y);
  }, [item.x, item.y, x, y]);

  // Converge toward the merge point while resolving a combine.
  useEffect(() => {
    if (item.busy && item.mergeX != null && item.mergeY != null) {
      const cx = animate(x, item.mergeX, { duration: 0.38, ease: "easeIn" });
      const cy = animate(y, item.mergeY, { duration: 0.38, ease: "easeIn" });
      return () => {
        cx.stop();
        cy.stop();
      };
    }
  }, [item.busy, item.mergeX, item.mergeY, x, y]);

  const state = item.busy
    ? "busy"
    : item.justCrafted
      ? "crafted"
      : isHoverTarget
        ? "target"
        : "idle";

  return (
    <motion.div
      data-canvas-card={item.instanceId}
      className="group absolute left-0 top-0 w-max cursor-grab active:cursor-grabbing"
      style={{ x, y, touchAction: "none", zIndex: state === "idle" ? 1 : 20 }}
      drag={!item.busy}
      dragMomentum={false}
      whileDrag={{ scale: 1.05, zIndex: 60 }}
      variants={{
        idle: { scale: 1, opacity: 1 },
        target: { scale: 1.06, opacity: 1 },
        busy: { scale: 0.42, opacity: 0.15 },
        crafted: { scale: [0.25, 1.16, 1], opacity: [0, 1, 1] },
      }}
      animate={state}
      transition={
        state === "crafted"
          ? { duration: 0.55, times: [0, 0.6, 1], ease: "backOut" }
          : { type: "spring", stiffness: 320, damping: 22 }
      }
      onDragStart={() => {
        dragging.current = true;
        onDragStartCard(item.instanceId);
      }}
      onDrag={() => onDragMoveCard(item.instanceId)}
      onDragEnd={() => {
        dragging.current = false;
        onMove(item.instanceId, x.get(), y.get());
        onDragEndCard(item.instanceId);
      }}
      onTap={() => {
        // A tap (no drag) inspects the element.
        if (!item.busy) onInspect(item.concept.id);
      }}
    >
      {/* Remove control — visible on hover only. */}
      {!item.busy && (
        <button
          aria-label="Remove tile"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.instanceId);
          }}
          className="absolute -right-1.5 -top-1.5 z-10 grid h-4 w-4 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface-3)] text-[10px] leading-none text-muted opacity-0 transition hover:text-fg group-hover:opacity-100"
        >
          ×
        </button>
      )}

      {/* Morph aura when this tile is the pending merge target. */}
      {isHoverTarget && (
        <motion.span
          className="pointer-events-none absolute -inset-2 rounded-2xl"
          style={{ border: `1.5px solid ${meta.color}`, boxShadow: `0 0 26px -2px ${meta.glow}` }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: [0.45, 0.9, 0.45], scale: [1, 1.03, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Shockwave ring on birth. */}
      {item.justCrafted && (
        <motion.span
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
          style={{ border: `2px solid ${meta.color}` }}
          initial={{ width: 20, height: 20, x: "-50%", y: "-50%", opacity: 0.9 }}
          animate={{ width: 240, height: 240, opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      )}

      <div style={{ filter: isHoverTarget ? `drop-shadow(0 0 10px ${meta.glow})` : undefined }}>
        <ConceptCardFace concept={item.concept} />
      </div>
    </motion.div>
  );
}
