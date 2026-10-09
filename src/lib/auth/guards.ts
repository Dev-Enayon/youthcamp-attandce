import "server-only";
import { redirect } from "next/navigation";
import type { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth/session";
import { toPublicAdmin, type PublicAdmin } from "@/server/services/auth";
import { can, type Permission } from "@/lib/permissions";

export async function getCurrentAdmin(): Promise<PublicAdmin | null> {
  const session = await readSession();
  if (!session) return null;

  const admin = await prisma.adminUser.findUnique({ where: { id: session.sub } });
  if (!admin || !admin.isActive) return null;

  return toPublicAdmin(admin);
}

/** For server components/pages: redirect unauthorised visitors to the login page. */
export async function requireAdmin(): Promise<PublicAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** For server actions: throw a generic FORBIDDEN error unless permitted. */
export async function requireAdminWithPermission(permission: Permission): Promise<PublicAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin || !can(admin.role, permission)) {
    throw new Error("FORBIDDEN");
  }
  return admin;
}

export { can };
export type { Permission };
export type { AdminRole };
