import type { CampSettings, PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db";
import type { RegistrationRequirements } from "@/lib/validation/registration";

type Db = PrismaClient;

/**
 * Return the active camp settings row, creating a minimal default row that
 * contains NO invented dates or venue information. All programme-specific
 * details remain empty until an administrator configures them.
 */
export async function getSettings(db: Db = defaultDb): Promise<CampSettings> {
  const existing = await db.campSettings.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;

  return db.campSettings.create({
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
      privacyNotice: null,
      terms: null,
    },
  });
}

export function requirementsFromSettings(settings: CampSettings): RegistrationRequirements {
  const raw = (settings.requiredFields ?? {}) as Record<string, unknown>;
  return {
    requireEmail: Boolean(raw.requireEmail),
    requireAddress: Boolean(raw.requireAddress),
    requireChurchAssembly: Boolean(raw.requireChurchAssembly),
    requirePastorName: Boolean(raw.requirePastorName),
    requirePastorPhone: Boolean(raw.requirePastorPhone),
    requireCategory: raw.requireCategory === undefined ? true : Boolean(raw.requireCategory),
    requireTShirt: Boolean(raw.requireTShirt),
    categories: Array.isArray(settings.categories) ? settings.categories : [],
    tShirtSizes: Array.isArray(settings.tShirtSizes) ? settings.tShirtSizes : [],
  };
}

export function isRegistrationOpen(settings: CampSettings, now: Date = new Date()): {
  open: boolean;
  reason?: "CLOSED" | "DEADLINE_PASSED";
} {
  if (!settings.registrationOpen) return { open: false, reason: "CLOSED" };
  if (settings.registrationDeadline && settings.registrationDeadline.getTime() < now.getTime()) {
    return { open: false, reason: "DEADLINE_PASSED" };
  }
  return { open: true };
}
