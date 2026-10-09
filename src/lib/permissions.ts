import type { AdminRole } from "@prisma/client";

export const PERMISSIONS = {
  SUPERADMIN: ["view", "view_sensitive", "manage_registrations", "manage_settings", "manage_admins", "export"],
  ADMIN: ["view", "view_sensitive", "manage_registrations", "manage_settings", "export"],
  STAFF: ["view", "export"],
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS][number];

export function can(role: AdminRole, permission: Permission): boolean {
  return (PERMISSIONS[role] as readonly string[]).includes(permission);
}

export function roleLabel(role: AdminRole): string {
  switch (role) {
    case "SUPERADMIN":
      return "Super Administrator";
    case "ADMIN":
      return "Administrator";
    case "STAFF":
      return "Staff";
  }
}
