/**
 * HAIRVANA — Redis connection and base cache utility.
 *
 * Provides a singleton ioredis client plus typed helpers for the common
 * caching patterns used across the service layer:
 *   - getOrSet  — read-through with automatic serialisation/deserialisation
 *   - invalidate — delete one or more cache keys
 *   - invalidatePattern — delete all keys matching a glob pattern
 *
 * TTL constants are defined here so every service references the same values.
 */

import Redis from 'ioredis/built/index.js';

// ─── TTL constants (seconds) ──────────────────────────────────────────────────

export const TTL = {
  /** Hairstyle gallery first page */
  HAIRSTYLE_GALLERY: 5 * 60,
  /** Stylist list first page */
  STYLIST_LIST: 5 * 60,
  /** Per-hairstyle bundle cost */
  BUNDLE_COST: 60 * 60,
  /** Product stock status */
  PRODUCT_STOCK: 60 * 60,
  /** Stylist availability (short TTL — 5 min reflect requirement) */
  STYLIST_AVAILABILITY: 5 * 60,
} as const;

// ─── Key builders ─────────────────────────────────────────────────────────────

export const CacheKey = {
  hairstyleGallery: (page: number, pageSize: number) =>
    `hairvana:hairstyles:gallery:${page}:${pageSize}`,
  hairstyleDetail: (id: string) => `hairvana:hairstyles:${id}`,
  bundleCost: (hairstyleId: string, stylistId?: string) =>
    `hairvana:bundle:${hairstyleId}:${stylistId ?? 'generic'}`,
  stylistList: (page: number, pageSize: number) =>
    `hairvana:stylists:list:${page}:${pageSize}`,
  stylistDetail: (id: string) => `hairvana:stylists:${id}`,
  productStock: (productId: string) => `hairvana:products:stock:${productId}`,
} as const;

// ─── Redis client ─────────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  // Retry up to 3 times before giving up; prevents hanging the app on cold start
  maxRetriesPerRequest: 3,
  // Lazy connect so the module can be imported in tests without a live Redis
  lazyConnect: true,
  // Surface connection errors as events rather than unhandled rejections
  enableOfflineQueue: false,
});

redis.on('connect', () => console.log('[redis] connected'));
redis.on('error', (err: Error) => console.error('[redis] error:', err.message));

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Read-through cache helper.
 *
 * Returns the cached value if present. If not, calls `fetcher()`, stores the
 * result under `key` with the given TTL, and returns the fresh value.
 *
 * Falls back to calling `fetcher()` directly if Redis is unavailable so the
 * application continues to function in a degraded state.
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }

    const fresh = await fetcher();
    await redis.setex(key, ttlSeconds, JSON.stringify(fresh));
    return fresh;
  } catch (err) {
    // Redis failure → serve from DB directly; log but don't crash
    console.error(`[cache] getOrSet error for key "${key}":`, (err as Error).message);
    return fetcher();
  }
}

/**
 * Remove one or more exact cache keys.
 */
export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    console.error('[cache] invalidate error:', (err as Error).message);
  }
}

/**
 * Remove all cache keys matching a glob pattern (e.g. `hairvana:bundle:*`).
 *
 * Uses SCAN to avoid blocking the Redis server with KEYS on large datasets.
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.error(`[cache] invalidatePattern error for "${pattern}":`, (err as Error).message);
  }
}
