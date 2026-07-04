// Redis client singleton. Degrades gracefully: if Redis is unreachable, the
// combine pipeline simply skips the Redis layer and falls through to Postgres.
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
};

function create(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const client = new Redis(url, {
    lazyConnect: false,
    maxRetriesPerRequest: 2,
    // Don't spam reconnects in dev; back off quickly then give up per-op.
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
  });
  client.on("error", (err) => {
    // Keep noise low — a missing Redis is non-fatal by design.
    if ((err as NodeJS.ErrnoException).code !== "ECONNREFUSED") {
      console.warn("[redis] error:", err.message);
    }
  });
  return client;
}

export const redis: Redis | null =
  globalForRedis.redis ?? create();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Wrap Redis ops so a transient failure never breaks a request.
export async function redisGet(key: string): Promise<string | null> {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function redisSet(key: string, value: string): Promise<void> {
  if (!redis) return;
  try {
    // Recipes are permanent, so no TTL — cache forever.
    await redis.set(key, value);
  } catch {
    /* ignore */
  }
}
