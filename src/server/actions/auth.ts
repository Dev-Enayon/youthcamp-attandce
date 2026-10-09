"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminLoginSchema } from "@/lib/validation/admin";
import { authenticateAdmin } from "@/server/services/auth";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, resetRateLimit } from "@/server/services/rate-limit";
import { recordAudit } from "@/server/services/audit";

export interface LoginState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const GENERIC_ERROR = "Invalid email or password.";

function clientIpFromHeaders(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "local";
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = adminLoginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Please check the highlighted fields.", fieldErrors };
  }

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  const rate = await checkRateLimit(undefined, `login:${ip}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    const minutes = Math.ceil(rate.retryAfterMs / 60000);
    return { error: `Too many login attempts. Please try again in ${minutes} minute(s).` };
  }

  const admin = await authenticateAdmin(parsed.data.email, parsed.data.password);
  if (!admin) {
    // Generic message: never reveal whether the account exists.
    return { error: GENERIC_ERROR };
  }

  await resetRateLimit(undefined, `login:${ip}`);

  const token = await createSessionToken({
    sub: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });
  // A brand-new token/cookie is issued on every login (session fixation safe).
  await setSessionCookie(token);

  await recordAudit(undefined, {
    adminUserId: admin.id,
    action: "ADMIN_LOGIN",
    entityType: "AdminUser",
    entityId: admin.id,
  });

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/admin/login");
}
