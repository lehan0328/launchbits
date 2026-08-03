/**
 * Rate Limiter — In-memory sliding window
 *
 * Provides per-IP rate limiting for API routes. Uses an in-memory Map
 * with automatic cleanup of expired entries.
 *
 * Note: On Vercel serverless, each function instance has its own memory.
 * This means rate limiting is per-instance, not global. It still protects
 * against sustained abuse from a single IP hitting the same instance.
 * For global rate limiting, use Vercel KV or Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Check if a request should be rate limited.
 *
 * @param key - Unique identifier (e.g., IP + route)
 * @param limit - Max requests per window
 * @param windowMs - Window duration in milliseconds
 * @returns Object with `allowed` boolean and rate limit headers
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  headers: Record<string, string>;
} {
  cleanup();

  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(limit - 1),
        'X-RateLimit-Reset': String(Math.ceil((now + windowMs) / 1000)),
      },
    };
  }

  entry.count++;

  const remaining = Math.max(0, limit - entry.count);
  const allowed = entry.count <= limit;

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    headers: {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
    },
  };
}

// ── Route-specific presets ──────────────────────────────────────────────────

/** Webhook routes: 100 req/min per IP */
export function rateLimitWebhook(ip: string, route: string) {
  return rateLimit(`webhook:${ip}:${route}`, 100, 60_000);
}

/** Interactivity routes: 60 req/min per IP */
export function rateLimitInteractivity(ip: string) {
  return rateLimit(`interact:${ip}`, 60, 60_000);
}

/** Auth routes (OAuth callbacks): 10 req/min per IP */
export function rateLimitAuth(ip: string) {
  return rateLimit(`auth:${ip}`, 10, 60_000);
}
