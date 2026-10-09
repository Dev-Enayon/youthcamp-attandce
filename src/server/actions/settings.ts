"use server";

import { revalidatePath } from "next/cache";
import { assemblySchema, settingsSchema } from "@/lib/validation/admin";
import { requireAdminWithPermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getSettings } from "@/server/services/settings";
import { recordAudit } from "@/server/services/audit";
import type { ActionState } from "@/server/actions/participants";

function zodToFieldErrors(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function toLagosDate(value: string | null, endOfDay = false): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}+01:00`);
  }
  // datetime-local has no timezone; interpret it as Africa/Lagos (UTC+1).
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}+01:00`);
}

function parseList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function updateSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const admin = await requireAdminWithPermission("manage_settings");
    const current = await getSettings();

    const raw = {
      title: String(formData.get("title") ?? ""),
      theme: String(formData.get("theme") ?? ""),
      bibleVerse: String(formData.get("bibleVerse") ?? ""),
      description: String(formData.get("description") ?? ""),
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? ""),
      venue: String(formData.get("venue") ?? ""),
      venueAddress: String(formData.get("venueAddress") ?? ""),
      registrationDeadline: String(formData.get("registrationDeadline") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      contactEmail: String(formData.get("contactEmail") ?? ""),
      registrationFee: String(formData.get("registrationFee") ?? ""),
      registrationOpen: formData.get("registrationOpen") === "on",
      capacity: String(formData.get("capacity") ?? ""),
      categories: parseList(formData.get("categories")),
      tShirtSizes: parseList(formData.get("tShirtSizes")),
      requiredFields: {
        requireEmail: formData.get("requireEmail") === "on",
        requireAddress: formData.get("requireAddress") === "on",
        requireChurchAssembly: formData.get("requireChurchAssembly") === "on",
        requirePastorName: formData.get("requirePastorName") === "on",
        requirePastorPhone: formData.get("requirePastorPhone") === "on",
        requireCategory: formData.get("requireCategory") === "on",
        requireTShirt: formData.get("requireTShirt") === "on",
      },
      privacyNotice: String(formData.get("privacyNotice") ?? ""),
      terms: String(formData.get("terms") ?? ""),
      privacyNoticeVersion: String(formData.get("privacyNoticeVersion") ?? "1.0"),
    };

    const parsed = settingsSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: "Please correct the highlighted fields.", fieldErrors: zodToFieldErrors(parsed.error) };
    }
    const data = parsed.data;

    await prisma.campSettings.update({
      where: { id: current.id },
      data: {
        title: data.title || null,
        theme: data.theme || null,
        bibleVerse: data.bibleVerse || null,
        description: data.description || null,
        startDate: toLagosDate(data.startDate),
        endDate: toLagosDate(data.endDate, true),
        venue: data.venue || null,
        venueAddress: data.venueAddress || null,
        registrationDeadline: toLagosDate(data.registrationDeadline, true),
        contactPhone: data.contactPhone || null,
        contactEmail: data.contactEmail || null,
        registrationFee: data.registrationFee === null ? null : data.registrationFee,
        registrationOpen: data.registrationOpen,
        capacity: data.capacity,
        categories: data.categories,
        tShirtSizes: data.tShirtSizes,
        requiredFields: data.requiredFields,
        privacyNotice: data.privacyNotice || null,
        terms: data.terms || null,
        privacyNoticeVersion: data.privacyNoticeVersion || "1.0",
      },
    });

    await recordAudit(undefined, {
      adminUserId: admin.id,
      action: "SETTINGS_UPDATED",
      entityType: "CampSettings",
      entityId: current.id,
    });

    revalidatePath("/");
    revalidatePath("/register");
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return { ok: true, message: "Camp settings saved." };
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "You do not have permission to change camp settings." };
    }
    console.error("updateSettingsAction failed", error);
    return { error: "We could not save the settings. Please try again." };
  }
}

export async function updateCategoriesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const admin = await requireAdminWithPermission("manage_settings");
    const current = await getSettings();
    const categories = parseList(formData.get("categories"));
    if (categories.length === 0) {
      return { error: "Add at least one participant category.", fieldErrors: { categories: "At least one category is required." } };
    }
    await prisma.campSettings.update({ where: { id: current.id }, data: { categories } });
    await recordAudit(undefined, {
      adminUserId: admin.id,
      action: "CATEGORIES_UPDATED",
      entityType: "CampSettings",
      entityId: current.id,
    });
    revalidatePath("/admin/categories");
    revalidatePath("/register");
    return { ok: true, message: "Participant categories saved." };
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "You do not have permission to manage categories." };
    }
    console.error("updateCategoriesAction failed", error);
    return { error: "We could not save the categories. Please try again." };
  }
}

export async function saveAssemblyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const admin = await requireAdminWithPermission("manage_settings");
    const parsed = assemblySchema.safeParse({
      name: String(formData.get("name") ?? ""),
      branch: String(formData.get("branch") ?? ""),
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) {
      return { error: "Please correct the highlighted fields.", fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const id = String(formData.get("id") ?? "");
    const data = {
      name: parsed.data.name,
      branch: parsed.data.branch || null,
      isActive: parsed.data.isActive,
    };

    if (id) {
      await prisma.churchAssembly.update({ where: { id }, data });
    } else {
      await prisma.churchAssembly.create({ data });
    }

    await recordAudit(undefined, {
      adminUserId: admin.id,
      action: id ? "ASSEMBLY_UPDATED" : "ASSEMBLY_CREATED",
      entityType: "ChurchAssembly",
      entityId: id || null,
    });

    revalidatePath("/admin/assemblies");
    revalidatePath("/register");
    return { ok: true, message: id ? "Assembly updated." : "Assembly added." };
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "You do not have permission to manage assemblies." };
    }
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { error: "An assembly with that name already exists." };
    }
    console.error("saveAssemblyAction failed", error);
    return { error: "We could not save the assembly. Please try again." };
  }
}

export async function toggleAssemblyAction(formData: FormData): Promise<void> {
  const admin = await requireAdminWithPermission("manage_settings");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const assembly = await prisma.churchAssembly.findUnique({ where: { id } });
  if (!assembly) return;
  await prisma.churchAssembly.update({ where: { id }, data: { isActive: !assembly.isActive } });
  await recordAudit(undefined, {
    adminUserId: admin.id,
    action: "ASSEMBLY_TOGGLED",
    entityType: "ChurchAssembly",
    entityId: id,
    safeMetadata: { isActive: !assembly.isActive },
  });
  revalidatePath("/admin/assemblies");
  revalidatePath("/register");
}
