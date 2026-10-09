import type { AdminUser, PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";

export type PublicAdmin = Omit<AdminUser, "passwordHash">;

export function toPublicAdmin(admin: AdminUser): PublicAdmin {
  const { passwordHash: _passwordHash, ...rest } = admin;
  return rest;
}

/**
 * Verify credentials. Always performs a password verification (even for
 * unknown accounts) to avoid leaking account existence via timing, and returns
 * a generic result on failure.
 */
export async function authenticateAdmin(
  email: string,
  password: string,
  db: PrismaClient = defaultDb,
): Promise<PublicAdmin | null> {
  const normalized = email.trim().toLowerCase();
  const admin = await db.adminUser.findUnique({ where: { email: normalized } });

  const hashToCheck =
    admin?.passwordHash ??
    "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000";
  const valid = await verifyPassword(hashToCheck, password);

  if (!admin || !admin.isActive || !valid) return null;

  await db.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return toPublicAdmin(admin);
}
