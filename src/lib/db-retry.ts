/**
 * Bounded retry helper for transient database connection failures.
 *
 * Serverless Postgres providers such as Neon suspend idle compute and can
 * briefly reject a brand-new connection while the compute wakes up. Prisma
 * surfaces that as a `PrismaClientInitializationError` (P1001/P1002/...) on the
 * first query of a fresh process. A single-shot CLI task such as the seed has no
 * tolerance for that blip, so we retry connection establishment with bounded
 * exponential backoff and jitter — while never retrying deterministic errors
 * (validation, authentication, unique-constraint, ...).
 *
 * This module intentionally has no Prisma import so it can be unit-tested in
 * isolation. The caller injects the operation to run.
 */

const RETRYABLE_PRISMA_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server timed out
  "P1008", // Operation timed out
  "P1017", // Server has closed the connection
]);

/** Extract a message string from any thrown value (Error, error-like object, primitive). */
function readMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

const TRANSIENT_MESSAGE_PATTERNS: RegExp[] = [
  /can'?t reach database server/i,
  /database server.*timed out/i,
  /operation timed out/i,
  /server has closed the connection/i,
  /connection terminated/i,
  /connection reset/i,
  /\beconnreset\b/i,
  /\betimedout\b/i,
  /\beconnrefused\b/i,
  /connection refused/i,
  /database server is starting up/i,
];

/**
 * True only for errors that are safe to retry: transient connectivity/timeout
 * failures. Deterministic errors (bad credentials, unique violations, validation)
 * return false so they fail fast.
 */
export function isRetryableDbError(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;

  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && RETRYABLE_PRISMA_CODES.has(code)) return true;

  const message = readMessage(error);
  const name = (error as { name?: unknown }).name;
  if (name === "PrismaClientInitializationError" && TRANSIENT_MESSAGE_PATTERNS.some((r) => r.test(message))) {
    return true;
  }
  return TRANSIENT_MESSAGE_PATTERNS.some((r) => r.test(message));
}

/**
 * Remove anything credential-shaped from an error message before it is logged,
 * so a failing retry can never leak a password, userinfo, or full connection
 * string.
 */
export function sanitizeErrorMessage(error: unknown): string {
  const message = readMessage(error) || String(error);
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "<redacted-connection-string>")
    .replace(/(password=)[^\s&"']+/gi, "$1<redacted>")
    .replace(/(\b[a-z][a-z0-9+.-]*:\/\/[^:@\s/]+:)[^@\s/]+(@)/gi, "$1<redacted>$2");
}

export type RetryInfo = {
  error: unknown;
  /** 1-based number of the attempt that just failed. */
  attempt: number;
  /** Delay (ms) that will be awaited before the next attempt. */
  delayMs: number;
};

export type RetryOptions = {
  /** Total attempts including the first. Default 5. */
  attempts?: number;
  /** Base backoff for the first retry, ms. Default 500. */
  baseDelayMs?: number;
  /** Upper bound for a single backoff, ms. Default 8000. */
  maxDelayMs?: number;
  /** Apply "full jitter" (random in [0, backoff]). Default true. */
  jitter?: boolean;
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (info: RetryInfo) => void | Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
};

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `operation`, retrying only retryable errors up to `attempts` times with
 * exponential backoff (capped at `maxDelayMs`) and optional full jitter.
 */
export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 5);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 500);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 8000);
  const jitter = options.jitter ?? true;
  const isRetryable = options.isRetryable ?? isRetryableDbError;
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryable(error)) {
        throw error;
      }
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delayMs = jitter ? Math.floor(random() * backoff) : backoff;
      await options.onRetry?.({ error, attempt, delayMs });
      await sleep(delayMs);
    }
  }
  throw lastError;
}