import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

/**
 * Runs once before the whole suite: applies Prisma migrations to the isolated
 * test database. Uses `migrate deploy` (non-destructive) so we never reset a
 * database that could contain data.
 */
export default function globalSetup() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL is required to run the test suite.");
  }
  if (/prod|production/i.test(testUrl)) {
    throw new Error("Refusing to run tests: TEST_DATABASE_URL looks like a production database.");
  }

  const root = path.dirname(fileURLToPath(import.meta.url));
  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(root, ".."),
    env: { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl },
    stdio: "inherit",
  });
}
