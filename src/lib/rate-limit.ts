// Rate limiting via Upstash Redis
// Fallback a in-memory Map en desarrollo si no hay Redis

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const memoryStore = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ success: boolean; remaining: number }> {
  // Intentar Upstash Redis
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/incr/${key}`, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
      });
      const { result: count } = await res.json();

      if (count === 1) {
        await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/expire/${key}/${config.windowSeconds}`, {
          headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
        });
      }

      return {
        success: count <= config.maxRequests,
        remaining: Math.max(0, config.maxRequests - count),
      };
    } catch {
      // Fallback a memoria
    }
  }

  // In-memory fallback (desarrollo)
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return { success: true, remaining: config.maxRequests - 1 };
  }

  record.count++;
  return {
    success: record.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - record.count),
  };
}

// Configuraciones predefinidas
export const RATE_LIMITS = {
  AUTH: { maxRequests: 5, windowSeconds: 60 },
  PAYMENT_UPLOAD: { maxRequests: 10, windowSeconds: 60 },
  VERIFY: { maxRequests: 100, windowSeconds: 60 },
} as const;
