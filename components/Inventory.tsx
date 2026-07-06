"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { ConceptCardFace } from "./ConceptCardFace";
import { RARITIES, RARITY_META, type ConceptDTO } from "@/lib/types";
import { levelFromXp, rankForLevel, totalXp } from "@/lib/leveling";

const CARD_W = 120;
const CARD_H = 38;

type DragState = { concept: ConceptDTO; x: number; y: number } | null;

export function Inventory() {
  const inventory = useGameStore((s) => s.inventory);
  const spawnCard = useGameStore((s) => s.spawnCard);
  const combineFromInventory = useGameStore((s) => s.combineFromInventory);
  const setHoverTargetId = useGameStore((s) => s.setHoverTargetId);
  const levelUp = useGameStore((s) => s.levelUp);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [drag, setDrag] = useState<DragState>(null);

  const panelRef = useRef<HTMLElement>(null);
  const dragConcept = useRef<ConceptDTO | null>(null);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  useEffect(() => setMounted(true), []);

  // --- gamification stats ---
  const stats = useMemo(() => {
    const byRarity: Record<string, number> = {};
    for (const c of inventory) byRarity[c.rarity] = (byRarity[c.rarity] ?? 0) + 1;
    const info = levelFromXp(totalXp(inventory));
    return { byRarity, ...info, rank: rankForLevel(info.level) };
  }, [inventory]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of inventory) set.add(c.category);
    return ["All", ...Array.from(set).sort()];
  }, [inventory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inventory
      .filter((c) => (category === "All" ? true : c.category === category))
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [inventory, query, category]);

  const spawnAtCenter = useCallback(
    (concept: ConceptDTO) => {
      const j = () => (Math.random() - 0.5) * 130;
      spawnCard(
        concept,
        Math.max(20, window.innerWidth / 2 - CARD_W / 2 + j()),
        Math.max(90, window.innerHeight / 2 - 150 + j()),
      );
    },
    [spawnCard],
  );

  // --- custom drag via pointer capture: a floating ghost that is never clipped,
  // and the capturing tile keeps receiving move/up even over the canvas. ---
  const onTileDown = (concept: ConceptDTO, e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragConcept.current = concept;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ concept, x: e.clientX, y: e.clientY });
  };

  const onTileMove = (e: React.PointerEvent) => {
    if (!dragConcept.current) return;
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 4) {
      moved.current = true;
    }
    setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    // Highlight canvas card under the pointer.
    const el = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((el) => (el as HTMLElement).dataset?.canvasCard) as HTMLElement | undefined;
    setHoverTargetId(el?.dataset.canvasCard ?? null);
  };

  const onTileUp = (e: React.PointerEvent) => {
    const concept = dragConcept.current;
    dragConcept.current = null;
    setDrag(null);
    setHoverTargetId(null);
    if (!concept) return;

    const panel = panelRef.current?.getBoundingClientRect();
    const overPanel =
      !!panel &&
      e.clientX >= panel.left &&
      e.clientY >= panel.top &&
      e.clientY <= panel.bottom;

    if (!moved.current) {
      spawnAtCenter(concept); // treated as a click
    } else if (!overPanel) {
      // Check if dropped on a canvas card — combine directly.
      const targetEl = document
        .elementsFromPoint(e.clientX, e.clientY)
        .find((el) => (el as HTMLElement).dataset?.canvasCard) as HTMLElement | undefined;
      const targetInstanceId = targetEl?.dataset.canvasCard;
      if (targetInstanceId) {
        const cardX = e.clientX - CARD_W / 2;
        const cardY = Math.max(70, e.clientY - CARD_H / 2);
        combineFromInventory(concept, targetInstanceId, cardX, cardY);
      } else {
        spawnCard(concept, e.clientX - CARD_W / 2, Math.max(70, e.clientY - CARD_H / 2));
      }
    }
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="panel pointer-events-auto absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl px-2 py-4 text-fg"
        aria-label="Open inventory"
      >
        <ChevronLeft size={14} className="text-muted" />
        <span className="label [writing-mode:vertical-rl]">Inventory · {inventory.length}</span>
      </button>
    );
  }

  return (
    <>
      <aside
        ref={panelRef}
        className="panel pointer-events-auto absolute bottom-3 right-3 top-3 z-30 flex w-[300px] flex-col overflow-hidden rounded-2xl"
      >
        {/* Header — gamified stats */}
        <div className="border-b border-[var(--line)] px-4 pb-3 pt-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-tight">Inventory</span>
              <span
                className="tabnum rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                style={{ background: "var(--surface-3)", color: "var(--muted)" }}
              >
                {inventory.length}
              </span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="label flex items-center gap-0.5 hover:text-fg"
              aria-label="Collapse inventory"
            >
              Hide <ChevronRight size={12} />
            </button>
          </div>

          {/* Level + XP bar */}
          <div className="mt-3 flex items-center gap-2.5">
            <motion.span
              className="tabnum grid h-8 w-8 shrink-0 place-items-center rounded-md text-[13px] font-bold"
              style={{
                background: "linear-gradient(180deg,var(--surface-3),var(--surface-1))",
                border: "1px solid var(--line)",
              }}
              animate={{
                boxShadow: levelUp
                  ? "inset 0 1px 0 0 var(--hi), 0 0 18px -2px #fbbf24"
                  : "inset 0 1px 0 0 var(--hi), 0 0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ duration: 0.5 }}
            >
              {stats.level}
            </motion.span>
            <div className="flex-1">
              <div className="mb-1 flex justify-between">
                <span className="label">
                  Lv {stats.level} · {stats.rank}
                </span>
                <span className="label tabnum">
                  {stats.into} / {stats.need} XP
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, var(--accent), #fbbf24)" }}
                  animate={{ width: `${Math.round(stats.progress * 100)}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 26 }}
                />
              </div>
            </div>
          </div>

          {/* Rarity tally */}
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
            {RARITIES.map((r) => (
              <span key={r} className="flex items-center gap-1.5" title={RARITY_META[r].label}>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: RARITY_META[r].color, opacity: stats.byRarity[r] ? 1 : 0.25 }}
                />
                <span
                  className="label tabnum"
                  style={{ opacity: stats.byRarity[r] ? 0.9 : 0.4 }}
                >
                  {stats.byRarity[r] ?? 0}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--faint)]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search inventory"
              className="w-full rounded-md border border-[var(--line)] bg-black/25 py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-[var(--faint)] focus:border-[var(--line-strong)]"
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto px-4 py-2.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="label shrink-0 rounded-full px-2.5 py-1 transition"
              style={
                category === c
                  ? { background: "var(--accent)", color: "var(--accent-ink)" }
                  : { background: "var(--surface-3)", color: "var(--muted)" }
              }
            >
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex flex-1 flex-wrap content-start gap-2 overflow-y-auto px-4 pb-4 pt-1">
          {filtered.map((concept) => (
            <button
              key={concept.id}
              onPointerDown={(e) => onTileDown(concept, e)}
              onPointerMove={onTileMove}
              onPointerUp={onTileUp}
              className="shrink-0 cursor-grab touch-none transition active:cursor-grabbing"
              style={{ opacity: drag?.concept.id === concept.id ? 0.4 : 1 }}
            >
              <ConceptCardFace concept={concept} />
            </button>
          ))}
          {filtered.length === 0 && (
            <span className="px-1 py-4 text-sm text-muted">No matches.</span>
          )}
        </div>

        <div className="border-t border-[var(--line)] px-4 py-2.5">
          <span className="label">Drag onto a card to transmute · tap to place on canvas</span>
        </div>
      </aside>

      {/* Floating drag ghost — portaled to body so nothing clips it. */}
      {mounted &&
        drag &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[100]"
            style={{
              left: drag.x,
              top: drag.y,
              transform: "translate(-50%, -50%) scale(1.08) rotate(-2deg)",
              filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.6))",
            }}
          >
            <ConceptCardFace concept={drag.concept} />
          </div>,
          document.body,
        )}
    </>
  );
}
