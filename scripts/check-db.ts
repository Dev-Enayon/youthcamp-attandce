/**
 * Read-only database connectivity check.
 *
 * Connects to the configured databases and runs `SELECT 1`. It NEVER creates,
 * updates or deletes records. Connection strings are never printed; error text
 * is scrubbed of anything that looks like a connection string.
 *
 *   npm run db:check
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

function sanitize(text: string): string {
  return text.replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "<redacted>");
}

async function check(label: string, url: string | undefined): Promise<boolean> {
  if (!url) {
    console.log(`${label}: SKIPPED (not configured)`);
    return false;
  }
  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    const rows = await client.$queryRaw<{ n: number }[]>`SELECT 1 AS n`;
    const ok = Array.isArray(rows) && Number(rows[0]?.n) === 1;
    console.log(`${label}: ${ok ? "PASS" : "FAIL"} — SELECT 1`);
    return ok;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`${label}: FAIL — ${sanitize(message)}`);
    return false;
  } finally {
    await client.$disconnect().catch(() => {});
  }
}

async function main() {
  const runtimeOk = await check("DATABASE_URL (runtime)", process.env.DATABASE_URL);
  const directOk = await check("DIRECT_URL (migrate)", process.env.DIRECT_URL);

  const outcome = process.env.DIRECT_URL ? runtimeOk && directOk : runtimeOk;
  console.log(outcome ? "All configured databases reachable." : "One or more checks failed.");
  process.exitCode = outcome ? 0 : 1;
}

main();