import { describe, expect, it, vi } from "vitest";
import { isRetryableDbError, sanitizeErrorMessage, withRetry } from "@/lib/db-retry";
import { prisma } from "@/lib/db";

function transientError(): Error & { code: string } {
  const error = new Error("Can't reach database server at db.example.neon.tech:5432") as Error & {
    code: string;
  };
  error.code = "P1001";
  return error;
}

function fatalError(): Error & { code: string } {
  const error = new Error("Unique constraint failed on the fields: (`email`)") as Error & {
    code: string;
  };
  error.code = "P2002";
  return error;
}

describe("isRetryableDbError", () => {
  it("treats transient connectivity/timeout errors as retryable", () => {
    expect(isRetryableDbError(transientError())).toBe(true);
    expect(isRetryableDbError({ code: "P1002" })).toBe(true);
    expect(isRetryableDbError({ code: "P1008" })).toBe(true);
    expect(isRetryableDbError({ code: "P1017" })).toBe(true);
    expect(
      isRetryableDbError({
        name: "PrismaClientInitializationError",
        message: "Can't reach database server at host:5432",
      }),
    ).toBe(true);
    expect(isRetryableDbError(new Error("read ECONNRESET"))).toBe(true);
  });

  it("does not treat deterministic errors as retryable", () => {
    expect(isRetryableDbError(fatalError())).toBe(false);
    expect(isRetryableDbError({ code: "P1000", message: "Authentication failed" })).toBe(false);
    expect(isRetryableDbError({ code: "P2025", message: "Record not found" })).toBe(false);
    expect(isRetryableDbError(new Error("boom"))).toBe(false);
    expect(isRetryableDbError(undefined)).toBe(false);
    expect(isRetryableDbError("not an error")).toBe(false);
  });
});

describe("sanitizeErrorMessage", () => {
  it("redacts connection strings and userinfo", () => {
    const message = sanitizeErrorMessage(
      new Error("failed postgresql://neondb_owner:secret@host/db?sslmode=require and password=hunter2"),
    );
    expect(message).not.toContain("secret");
    expect(message).not.toContain("hunter2");
    expect(message).toContain("<redacted-connection-string>");
    expect(message).toContain("password=<redacted>");
  });

  it("passes through plain messages", () => {
    expect(sanitizeErrorMessage(new Error("plain failure"))).toBe("plain failure");
  });
});

describe("withRetry", () => {
  it("returns immediately on success without retrying", async () => {
    const operation = vi.fn().mockResolvedValue("ok");
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await withRetry(operation, { sleep });

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries transient failures and eventually succeeds", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(transientError())
      .mockRejectedValueOnce(transientError())
      .mockResolvedValue("ok");
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await withRetry(operation, {
      attempts: 5,
      baseDelayMs: 10,
      maxDelayMs: 40,
      sleep,
      random: () => 1,
    });

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([10, 20]);
  });

  it("exhausts retries and throws the last error", async () => {
    const operation = vi.fn().mockRejectedValue(transientError());
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withRetry(operation, { attempts: 3, baseDelayMs: 5, sleep, random: () => 1 })).rejects.toThrow(
      /Can't reach database server/,
    );
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable errors", async () => {
    const operation = vi.fn().mockRejectedValue(fatalError());
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withRetry(operation, { attempts: 5, sleep })).rejects.toThrow(/Unique constraint/);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("caps backoff at maxDelayMs", async () => {
    const operation = vi.fn().mockRejectedValue(transientError());
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      withRetry(operation, { attempts: 5, baseDelayMs: 10, maxDelayMs: 25, sleep, random: () => 1 }),
    ).rejects.toThrow();
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([10, 20, 25, 25]);
  });

  it("invokes onRetry with the failed attempt number and delay", async () => {
    const operation = vi.fn().mockRejectedValueOnce(transientError()).mockResolvedValue("ok");
    const onRetry = vi.fn();
    const sleep = vi.fn().mockResolvedValue(undefined);

    await withRetry(operation, { baseDelayMs: 10, sleep, random: () => 1, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0][0]).toMatchObject({ attempt: 1, delayMs: 10 });
  });

  it("works against the isolated test database (eventual-success integration)", async () => {
    const rows = await withRetry(
      () => prisma.$queryRaw<{ n: number }[]>`SELECT 1 AS n`,
      { attempts: 3, baseDelayMs: 10 },
    );
    expect(Number(rows[0]?.n)).toBe(1);
  });
});