import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { sanitizeErrorMessage, withRetry } from "../src/lib/db-retry";

const prisma = new PrismaClient();

/**
 * Serverless Postgres (Neon) can reject a fresh connection while a suspended
 * compute wakes up, which Prisma reports as P1001 on the first query of this
 * short-lived process. Retry connection establishment with bounded backoff.
 */
const RETRY_OPTIONS = {
  attempts: 5,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
} as const;

/**
 * Read-only snapshot of the seed-owned rows. Used before a retry so we can tell
 * whether a previous attempt partially completed, without ever mutating data.
 */
async function readStateSnapshot(): Promise<string> {
  const [admins, settings, assemblies] = await Promise.all([
    prisma.adminUser.count(),
    prisma.campSettings.count(),
    prisma.churchAssembly.count(),
  ]);
  return JSON.stringify({ admins, settings, assemblies });
}

async function runWithRetry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  return withRetry(operation, {
    ...RETRY_OPTIONS,
    onRetry: async ({ attempt, delayMs }) => {
      let snapshot = "unavailable";
      try {
        snapshot = await readStateSnapshot();
      } catch {
        // The connection is still down; state cannot be read right now.
      }
      console.warn(
        `[seed] ${label} hit a transient connection error (attempt ${attempt}/${RETRY_OPTIONS.attempts}); ` +
          `retrying in ${delayMs}ms; current state=${snapshot}`,
      );
    },
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Camp Administrator";

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment before seeding.",
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
  }

  // Establish connectivity (read-only) before writing anything.
  await runWithRetry("connect", () => prisma.$queryRaw`SELECT 1`);

  const passwordHash = await hashPassword(password);

  // Idempotent upsert: safe to re-run and reconciles any partial previous run.
  const admin = await runWithRetry("admin.upsert", () =>
    prisma.adminUser.upsert({
      where: { email },
      update: { name, passwordHash, isActive: true, role: "SUPERADMIN" },
      create: { email, name, passwordHash, role: "SUPERADMIN", isActive: true },
    }),
  );

  // Idempotent create-if-absent: rechecks inside the retried operation, so an
  // ambiguous network failure that actually committed cannot duplicate the row.
  await runWithRetry("settings.createIfAbsent", async () => {
    const existing = await prisma.campSettings.findFirst({ orderBy: { createdAt: "asc" } });
    if (existing) return;
    await prisma.campSettings.create({
      data: {
        title: null,
        currency: "NGN",
        registrationOpen: true,
        categories: ["Youth", "Teenager", "Other"],
        tShirtSizes: ["S", "M", "L", "XL", "XXL"],
        requiredFields: {
          requireEmail: false,
          requireAddress: false,
          requireChurchAssembly: false,
          requirePastorName: false,
          requirePastorPhone: false,
          requireCategory: true,
          requireTShirt: false,
        },
        privacyNoticeVersion: "1.0",
      },
    });
  });

  await runWithRetry("assembly.upsert", () =>
    prisma.churchAssembly.upsert({
      where: { name: "Gospel Of Truth Mission" },
      update: { branch: "Lagos Ogun Badagry", isActive: true },
      create: {
        name: "Gospel Of Truth Mission",
        branch: "Lagos Ogun Badagry",
        isActive: true,
      },
    }),
  );

  console.log(`Seed complete. Superadmin ready: ${admin.email}`);
  console.log("No camp dates, venue or fees were set — configure them in Admin → Camp Settings.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", sanitizeErrorMessage(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });