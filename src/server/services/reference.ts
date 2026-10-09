import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export const REFERENCE_PREFIX = "GTM-YC";

/**
 * Atomically allocate the next per-year registration number and format a
 * unique public reference, e.g. `GTM-YC-2026-00001`.
 *
 * Uses a single UPSERT with `RETURNING`, so concurrent submissions are
 * serialised by PostgreSQL and can never receive the same number.
 */
export async function nextRegistrationReference(
  tx: Tx,
  year: number,
  prefix: string = REFERENCE_PREFIX,
): Promise<string> {
  const rows = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "RegistrationCounter" ("year", "lastNumber", "updatedAt")
    VALUES (${year}, 1, NOW())
    ON CONFLICT ("year")
    DO UPDATE SET "lastNumber" = "RegistrationCounter"."lastNumber" + 1,
                  "updatedAt" = NOW()
    RETURNING "lastNumber";
  `;

  const next = Number(rows[0]?.lastNumber ?? 1);
  return `${prefix}-${year}-${String(next).padStart(5, "0")}`;
}
