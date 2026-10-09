import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { authenticateAdmin } from "@/server/services/auth";
import { checkRateLimit } from "@/server/services/rate-limit";
import { createAdmin, resetDb } from "./helpers";

describe("admin authentication and authorisation", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("authenticates a valid active administrator", async () => {
    await createAdmin("ADMIN", "admin@example.com");
    const admin = await authenticateAdmin("Admin@Example.com", "Password!123");
    expect(admin).not.toBeNull();
    expect(admin?.email).toBe("admin@example.com");
    expect(admin).not.toHaveProperty("passwordHash");
  });

  it("rejects an incorrect password", async () => {
    await createAdmin("ADMIN", "admin@example.com");
    expect(await authenticateAdmin("admin@example.com", "wrong-password")).toBeNull();
  });

  it("rejects unknown accounts", async () => {
    expect(await authenticateAdmin("nobody@example.com", "Password!123")).toBeNull();
  });

  it("rejects deactivated accounts", async () => {
    const admin = await createAdmin("ADMIN", "inactive@example.com");
    await prisma.adminUser.update({ where: { id: admin.id }, data: { isActive: false } });
    expect(await authenticateAdmin("inactive@example.com", "Password!123")).toBeNull();
  });

  it("enforces the role permission matrix", () => {
    expect(can("SUPERADMIN", "manage_admins")).toBe(true);
    expect(can("ADMIN", "manage_admins")).toBe(false);
    expect(can("ADMIN", "view_sensitive")).toBe(true);
    expect(can("STAFF", "view_sensitive")).toBe(false);
    expect(can("STAFF", "manage_registrations")).toBe(false);
    expect(can("STAFF", "export")).toBe(true);
    expect(can("STAFF", "view")).toBe(true);
  });

  it("rate limits repeated attempts", async () => {
    for (let i = 0; i < 3; i++) {
      const result = await checkRateLimit(prisma, "login:test", 3, 60_000);
      expect(result.allowed).toBe(true);
    }
    const blocked = await checkRateLimit(prisma, "login:test", 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });
});
