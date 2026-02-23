/**
 * Simple in-memory rate limiter using sliding window.
 * For production, consider Redis-backed solution (@upstash/ratelimit).
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 60_000 * 10);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 5 * 60_000);

/**
 * Check rate limit for a given key.
 * @param key - Unique identifier (e.g., userId, IP)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { success: boolean, remaining: number, retryAfterMs: number }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key) || { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = oldest + windowMs - now;
    store.set(key, entry);
    return { success: false, remaining: 0, retryAfterMs };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { success: true, remaining: limit - entry.timestamps.length, retryAfterMs: 0 };
}
