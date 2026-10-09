"use server";

import { revalidatePath } from "next/cache";
import {
  noteSchema,
  participantUpdateSchema,
  statusChangeSchema,
} from "@/lib/validation/admin";
import { requireAdminWithPermission } from "@/lib/auth/guards";
import {
  addParticipantNote,
  changeRegistrationStatus,
  updateParticipant,
} from "@/server/services/participants";

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}

function zodToFieldErrors(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function formToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") obj[key] = value;
  }
  return obj;
}

export async function updateParticipantAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const admin = await requireAdminWithPermission("manage_registrations");
    const parsed = participantUpdateSchema.safeParse(formToObject(formData));
    if (!parsed.success) {
      return { error: "Please correct the highlighted fields.", fieldErrors: zodToFieldErrors(parsed.error) };
    }
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Missing participant id." };

    await updateParticipant(id, parsed.data, admin.id);
    revalidatePath(`/admin/registrations/${id}`);
    revalidatePath("/admin/registrations");
    return { ok: true, message: "Registration updated." };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { error: "Participant not found." };
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "You do not have permission to edit registrations." };
    }
    console.error("updateParticipantAction failed", error);
    return { error: "We could not save your changes. Please try again." };
  }
}

export async function changeStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const admin = await requireAdminWithPermission("manage_registrations");
    const parsed = statusChangeSchema.safeParse(formToObject(formData));
    if (!parsed.success) {
      return { error: "Invalid status change.", fieldErrors: zodToFieldErrors(parsed.error) };
    }
    await changeRegistrationStatus(
      parsed.data.participantId,
      parsed.data.status,
      parsed.data.reason || null,
      admin.id,
    );
    revalidatePath(`/admin/registrations/${parsed.data.participantId}`);
    revalidatePath("/admin/registrations");
    return { ok: true, message: "Registration status updated." };
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "You do not have permission to change registration status." };
    }
    console.error("changeStatusAction failed", error);
    return { error: "We could not update the status. Please try again." };
  }
}

export async function addNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const admin = await requireAdminWithPermission("manage_registrations");
    const parsed = noteSchema.safeParse(formToObject(formData));
    if (!parsed.success) {
      return { error: "Please enter a note.", fieldErrors: zodToFieldErrors(parsed.error) };
    }
    await addParticipantNote(parsed.data.participantId, parsed.data.body, admin.id);
    revalidatePath(`/admin/registrations/${parsed.data.participantId}`);
    return { ok: true, message: "Note added." };
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "You do not have permission to add notes." };
    }
    console.error("addNoteAction failed", error);
    return { error: "We could not add the note. Please try again." };
  }
}
