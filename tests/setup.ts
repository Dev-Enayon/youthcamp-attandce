import "dotenv/config";

// Point all database access at the isolated test database BEFORE any Prisma
// module is imported. Never runs against production data.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("TEST_DATABASE_URL is required to run the test suite.");
}
process.env.DATABASE_URL = testUrl;
process.env.DIRECT_URL = testUrl;
// NODE_ENV is already "test" under Vitest.
process.env.AUTH_SECRET ??= "test-secret-value-that-is-long-enough-1234567890";
process.env.APP_URL ??= "http://localhost:3000";
