"use client";

import { RARITY_META, type ConceptDTO } from "@/lib/types";

/**
 * A compact, collectible-feeling concept tile: an emoji "coin" + name.
 * Rarity is expressed entirely through color — a gradient border, a tinted
 * gem holder, and a glow whose intensity scales with rarity. No extra text.
 */
export function ConceptCardFace({ concept }: { concept: ConceptDTO }) {
  const meta = RARITY_META[concept.rarity];
  const high = concept.rarity === "EPIC" || concept.rarity === "LEGENDARY";

  return (
    <div
      className={`no-select relative flex items-center gap-2 overflow-hidden rounded-[11px] py-1.5 pl-1.5 pr-3 ${
        concept.rarity === "LEGENDARY" ? "legendary-sheen" : ""
      }`}
      style={{
        // Two-layer background = solid surface + a gradient *border*.
        background: `linear-gradient(180deg, var(--surface-2), var(--surface-1)) padding-box,
          linear-gradient(135deg, ${meta.color}, ${meta.color}55 52%, ${meta.color}22) border-box`,
        border: "1.5px solid transparent",
        boxShadow: `inset 0 1px 0 0 var(--hi), 0 6px 18px -10px ${meta.glow}${
          high ? `, 0 0 20px -7px ${meta.glow}` : ""
        }`,
      }}
    >
      {/* Rarity wash spilling from behind the coin. */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(62% 130% at 12% 50%, ${meta.color}20, transparent 60%)`,
        }}
      />

      {/* Emoji coin — a small tinted gem holder with an inner ring. */}
      <span
        className="relative grid h-6 w-6 shrink-0 place-items-center rounded-[7px] text-[14px]"
        style={{
          background: `radial-gradient(circle at 50% 25%, ${meta.color}33, rgba(0,0,0,0.4))`,
          boxShadow: `inset 0 0 0 1px ${meta.color}3d, inset 0 1px 0 0 var(--hi)`,
        }}
      >
        {concept.emoji}
      </span>

      <span className="relative whitespace-nowrap text-[13px] font-medium leading-tight">
        {concept.name}
      </span>
    </div>
  );
}
