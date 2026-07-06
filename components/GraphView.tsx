"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { Maximize } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { RARITY_META, type ConceptDTO } from "@/lib/types";

interface GNode extends SimulationNodeDatum {
  id: string;
  name: string;
  emoji: string;
  rarity: ConceptDTO["rarity"];
  category: string;
}
type GLink = SimulationLinkDatum<GNode>;

interface Edge {
  id: string;
  left: string;
  right: string;
  result: string;
}

export function GraphView() {
  const inventory = useGameStore((s) => s.inventory);
  const selected = useGameStore((s) => s.inspectId);
  const setSelected = useGameStore((s) => s.setInspect);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation<GNode, GLink> | null>(null);
  const nodesRef = useRef<GNode[]>([]);
  const linksRef = useRef<GLink[]>([]);

  const [, setTick] = useState(0);
  const [size, setSize] = useState({ w: 1000, h: 700 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);

  const ids = useMemo(() => inventory.map((c) => c.id), [inventory]);

  // Measure the container.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load graph + build the simulation whenever the known set changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const res = await fetch("/api/graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = (await res.json()) as { nodes: ConceptDTO[]; edges: Edge[] };
      if (cancelled) return;

      // Preserve positions of nodes that already existed (keeps layout stable).
      const prev = new Map(nodesRef.current.map((n) => [n.id, n]));
      const nodes: GNode[] = data.nodes.map((c) => {
        const p = prev.get(c.id);
        return {
          id: c.id,
          name: c.name,
          emoji: c.emoji,
          rarity: c.rarity,
          category: c.category,
          x: p?.x ?? size.w / 2 + (Math.random() - 0.5) * 400,
          y: p?.y ?? size.h / 2 + (Math.random() - 0.5) * 300,
        };
      });
      // Each recipe becomes two links: result←left and result←right.
      const links: GLink[] = [];
      for (const e of data.edges) {
        links.push({ source: e.result, target: e.left });
        links.push({ source: e.result, target: e.right });
      }

      nodesRef.current = nodes;
      linksRef.current = links;

      simRef.current?.stop();
      const sim = forceSimulation<GNode>(nodes)
        .force(
          "link",
          forceLink<GNode, GLink>(links)
            .id((d) => d.id)
            .distance(78)
            .strength(0.25),
        )
        .force("charge", forceManyBody<GNode>().strength(-220))
        .force("collide", forceCollide<GNode>(30))
        .force("center", forceCenter(size.w / 2, size.h / 2))
        .force("x", forceX(size.w / 2).strength(0.04))
        .force("y", forceY(size.h / 2).strength(0.04))
        .on("tick", () => setTick((t) => (t + 1) % 1_000_000));

      simRef.current = sim;
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // Rebuild only when the set of ids changes (not on every size tweak).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  useEffect(
    () => () => {
      simRef.current?.stop();
    },
    [],
  );

  // Re-center the layout when the container is (re)measured, so the graph
  // isn't laid out around a stale default size.
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.force("center", forceCenter(size.w / 2, size.h / 2));
    (sim.force("x") as ReturnType<typeof forceX<GNode>> | undefined)?.x(size.w / 2);
    (sim.force("y") as ReturnType<typeof forceY<GNode>> | undefined)?.y(size.h / 2);
    sim.alpha(0.3).restart();
  }, [size.w, size.h]);

  // --- interaction (pan / zoom / node drag / select) ---
  const drag = useRef<
    | { mode: "pan"; startX: number; startY: number; panX: number; panY: number; moved: boolean }
    | { mode: "node"; node: GNode; moved: boolean }
    | null
  >(null);

  const toGraph = (clientX: number, clientY: number) => {
    const r = containerRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left - pan.x) / zoom, y: (clientY - r.top - pan.y) / zoom };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* no active pointer (e.g. synthetic events) */
    }
    const nodeId = (e.target as HTMLElement).closest("[data-node]")?.getAttribute("data-node");
    if (nodeId) {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (node) {
        const p = toGraph(e.clientX, e.clientY);
        node.fx = p.x;
        node.fy = p.y;
        simRef.current?.alphaTarget(0.3).restart();
        drag.current = { mode: "node", node, moved: false };
        return;
      }
    }
    drag.current = { mode: "pan", startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.mode === "node") {
      const p = toGraph(e.clientX, e.clientY);
      d.node.fx = p.x;
      d.node.fy = p.y;
      d.moved = true;
    } else {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.hypot(dx, dy) > 3) d.moved = true;
      setPan({ x: d.panX + dx, y: d.panY + dy });
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.mode === "node") {
      simRef.current?.alphaTarget(0);
      d.node.fx = null;
      d.node.fy = null;
      if (!d.moved) setSelected(selected === d.node.id ? null : d.node.id);
    } else if (!d.moved) {
      setSelected(null);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const r = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const next = Math.min(3, Math.max(0.25, zoom * factor));
    setPan((p) => ({ x: mx - (mx - p.x) * (next / zoom), y: my - (my - p.y) * (next / zoom) }));
    setZoom(next);
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setSelected(null);
    simRef.current?.alpha(0.5).restart();
  };

  // Neighbor highlighting for the selected node.
  const neighbors = useMemo(() => {
    if (!selected) return null;
    const set = new Set<string>([selected]);
    for (const l of linksRef.current) {
      const s = (l.source as GNode).id ?? (l.source as unknown as string);
      const t = (l.target as GNode).id ?? (l.target as unknown as string);
      if (s === selected) set.add(t);
      if (t === selected) set.add(s);
    }
    return set;
    // recompute when selection changes or graph re-ticks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, linksRef.current.length]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none select-none overflow-hidden"
      style={{ cursor: drag.current?.mode === "pan" ? "grabbing" : "default" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    >
      <div className="workspace-bg" />

      <svg width={size.w} height={size.h} className="relative block">
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* edges */}
          {linksRef.current.map((l, i) => {
            const s = l.source as GNode;
            const t = l.target as GNode;
            if (s.x == null || t.x == null) return null;
            const dim = neighbors && !(neighbors.has(s.id) && neighbors.has(t.id));
            return (
              <line
                key={i}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="#ffffff"
                strokeOpacity={dim ? 0.04 : 0.14}
                strokeWidth={1 / zoom < 1 ? 1 : 1}
              />
            );
          })}

          {/* nodes */}
          {nodesRef.current.map((n) => {
            if (n.x == null || n.y == null) return null;
            const meta = RARITY_META[n.rarity];
            const dim = neighbors ? !neighbors.has(n.id) : false;
            const isSel = selected === n.id;
            const r = 18;
            return (
              <g
                key={n.id}
                data-node={n.id}
                transform={`translate(${n.x},${n.y})`}
                style={{ cursor: "grab", opacity: dim ? 0.28 : 1 }}
              >
                <circle
                  r={r + (isSel ? 4 : 0)}
                  fill="var(--surface-2)"
                  stroke={meta.color}
                  strokeWidth={isSel ? 2.5 : 1.5}
                  style={{ filter: isSel ? `drop-shadow(0 0 8px ${meta.glow})` : undefined }}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={16}
                  style={{ pointerEvents: "none" }}
                >
                  {n.emoji}
                </text>
                <text
                  y={r + 12}
                  textAnchor="middle"
                  fontSize={10}
                  fill={dim ? "var(--faint)" : "var(--muted)"}
                  style={{ pointerEvents: "none" }}
                >
                  {n.name.length > 18 ? n.name.slice(0, 17) + "…" : n.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* empty / loading states */}
      {(loading || nodesRef.current.length === 0) && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="label">
            {loading ? "Charting the web…" : "Transmute elements to grow your graph"}
          </p>
        </div>
      )}

      {/* controls */}
      <div className="pointer-events-auto absolute bottom-4 left-4 flex items-center gap-2">
        <button
          onClick={resetView}
          className="panel label flex items-center gap-1.5 rounded-lg px-3 py-2 hover:text-fg"
        >
          <Maximize size={13} /> Reset view
        </button>
        <span className="label tabnum">{Math.round(zoom * 100)}%</span>
      </div>
      {/* Element detail is rendered globally (shared with the canvas). */}
    </div>
  );
}
