import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Database-backed fixed-window rate limiter. Works across serverless instances
 * because state is stored in PostgreSQL rather than in process memory.
 */
export async function checkRateLimit(
  db: PrismaClient = defaultDb,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const expiresAt = new Date(Date.now() + windowMs);

  const rows = await db.$queryRaw<{ count: number; expiresAt: Date }[]>`
    INSERT INTO "RateLimitEntry" ("key", "count", "expiresAt")
    VALUES (${key}, 1, ${expiresAt})
    ON CONFLICT ("key")
    DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitEntry"."expiresAt" < NOW() THEN 1
        ELSE "RateLimitEntry"."count" + 1
      END,
      "expiresAt" = CASE
        WHEN "RateLimitEntry"."expiresAt" < NOW() THEN ${expiresAt}
        ELSE "RateLimitEntry"."expiresAt"
      END
    RETURNING "count", "expiresAt";
  `;

  const count = Number(rows[0]?.count ?? 1);
  const windowEnd = rows[0]?.expiresAt ?? expiresAt;
  const retryAfterMs = Math.max(0, new Date(windowEnd).getTime() - Date.now());

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterMs,
  };
}

export async function resetRateLimit(db: PrismaClient = defaultDb, key: string) {
  await db.rateLimitEntry.deleteMany({ where: { key } });
}

/** Occasional cleanup of expired rows; safe to call opportunistically. */
export async function cleanupRateLimits(db: PrismaClient = defaultDb) {
  await db.rateLimitEntry.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
