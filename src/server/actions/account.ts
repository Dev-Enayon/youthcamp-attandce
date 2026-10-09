"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, requireAdminWithPermission } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { recordAudit } from "@/server/services/audit";
import type { ActionState } from "@/server/actions/participants";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Enter your current password" }),
    newPassword: z.string().min(8, { message: "New password must be at least 8 characters" }),
    confirmPassword: z.string().min(1, { message: "Confirm your new password" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const sessionAdmin = await requireAdmin();
    const parsed = changePasswordSchema.safeParse({
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { error: "Please correct the highlighted fields.", fieldErrors };
    }

    const admin = await prisma.adminUser.findUnique({ where: { id: sessionAdmin.id } });
    if (!admin) return { error: "Account not found." };

    const valid = await verifyPassword(admin.passwordHash, parsed.data.currentPassword);
    if (!valid) {
      return { error: "Your current password is incorrect.", fieldErrors: { currentPassword: "Incorrect password" } };
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash } });

    await recordAudit(undefined, {
      adminUserId: admin.id,
      action: "PASSWORD_CHANGED",
      entityType: "AdminUser",
      entityId: admin.id,
    });

    revalidatePath("/admin/account");
    return { ok: true, message: "Password updated successfully." };
  } catch (error) {
    console.error("changePasswordAction failed", error);
    return { error: "We could not change your password. Please try again." };
  }
}

const createAdminSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(120),
  email: z.string().trim().email({ message: "Enter a valid email" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  role: z.enum(["SUPERADMIN", "ADMIN", "STAFF"]),
});

export async function createAdminAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const acting = await requireAdminWithPermission("manage_admins");
    const parsed = createAdminSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? "STAFF"),
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { error: "Please correct the highlighted fields.", fieldErrors };
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return { error: "An administrator with that email already exists.", fieldErrors: { email: "Already in use" } };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const created = await prisma.adminUser.create({
      data: { name: parsed.data.name, email, passwordHash, role: parsed.data.role, isActive: true },
    });

    await recordAudit(undefined, {
      adminUserId: acting.id,
      action: "ADMIN_CREATED",
      entityType: "AdminUser",
      entityId: created.id,
      safeMetadata: { role: created.role },
    });

    revalidatePath("/admin/account");
    return { ok: true, message: `Administrator ${created.email} created.` };
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "Only a Super Administrator can create admin accounts." };
    }
    console.error("createAdminAction failed", error);
    return { error: "We could not create the administrator. Please try again." };
  }
}
