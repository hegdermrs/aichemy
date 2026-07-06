// In-process runtime metrics for the combine pipeline. Powers the stats
// dashboard (cache hit rate, average latency, source breakdown).
//
// NOTE: in-memory + per-process — resets on server restart and isn't shared
// across serverless instances. Fine for local/dev insight; a real deployment
// would push these to a metrics store.
import type { CombineResult } from "./types";

type Source = CombineResult["source"];

interface Metrics {
  bySource: Record<Source, number>;
  latencyTotalMs: number;
  latencyCount: number;
  prefetchQueued: number;
  prefetchGenerated: number;
}

const globalForMetrics = globalThis as unknown as { craftMetrics?: Metrics };

export const metrics: Metrics =
  globalForMetrics.craftMetrics ??
  (globalForMetrics.craftMetrics = {
    bySource: { memory: 0, redis: 0, database: 0, generated: 0 },
    latencyTotalMs: 0,
    latencyCount: 0,
    prefetchQueued: 0,
    prefetchGenerated: 0,
  });

export function recordCombine(source: Source, ms: number): void {
  metrics.bySource[source] += 1;
  metrics.latencyTotalMs += ms;
  metrics.latencyCount += 1;
}

export function recordPrefetchQueued(n: number): void {
  metrics.prefetchQueued += n;
}

export function recordPrefetchGenerated(): void {
  metrics.prefetchGenerated += 1;
}

export function metricsSnapshot() {
  const total = Object.values(metrics.bySource).reduce((a, b) => a + b, 0);
  const cached = total - metrics.bySource.generated;
  return {
    total,
    bySource: { ...metrics.bySource },
    cacheHitRate: total ? cached / total : 0,
    avgMs: metrics.latencyCount ? Math.round(metrics.latencyTotalMs / metrics.latencyCount) : 0,
    prefetchQueued: metrics.prefetchQueued,
    prefetchGenerated: metrics.prefetchGenerated,
  };
}
