import { Prisma, type Participant, type PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db";
import { calculateAge } from "@/lib/utils";
import type { RegistrationInput } from "@/lib/validation/registration";
import { nextRegistrationReference } from "@/server/services/reference";
import { getSettings, isRegistrationOpen } from "@/server/services/settings";

export type RegistrationErrorCode =
  | "REGISTRATION_CLOSED"
  | "DEADLINE_PASSED"
  | "CAPACITY_REACHED"
  | "DUPLICATE_REGISTRATION"
  | "INVALID_ASSEMBLY"
  | "VALIDATION_ERROR"
  | "DATABASE_UNAVAILABLE";

export type CreateRegistrationResult =
  | { ok: true; participant: Participant; created: boolean }
  | { ok: false; code: RegistrationErrorCode; message: string; fieldErrors?: Record<string, string> };

const MAX_RETRIES = 4;

function isSerializationError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
  );
}

export interface CreateRegistrationOptions {
  db?: PrismaClient;
  now?: Date;
}

/**
 * Create a camp registration with all business rules enforced server-side:
 *  - registration window (open flag + deadline)
 *  - capacity limit (serialised inside a serializable transaction)
 *  - idempotency (safe retries)
 *  - duplicate protection (same name + phone + date of birth)
 *  - unique registration reference
 */
export async function createRegistration(
  input: RegistrationInput,
  options: CreateRegistrationOptions = {},
): Promise<CreateRegistrationResult> {
  const db = options.db ?? defaultDb;
  const now = options.now ?? new Date();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          // Ensure settings exist, then lock the row to serialise capacity checks.
          await getSettings(tx as unknown as PrismaClient);
          const locked = await tx.$queryRaw<{ id: string }[]>`
            SELECT "id" FROM "CampSettings" ORDER BY "createdAt" ASC LIMIT 1 FOR UPDATE;
          `;
          const settings = locked[0]
            ? await tx.campSettings.findUnique({ where: { id: locked[0].id } })
            : null;
          if (!settings) {
            return {
              ok: false as const,
              code: "DATABASE_UNAVAILABLE" as const,
              message: "Registration is temporarily unavailable. Please try again shortly.",
            };
          }

          // Idempotent retries: return the existing registration for the same key.
          const existing = await tx.participant.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
          });
          if (existing) {
            return { ok: true as const, participant: existing, created: false };
          }

          const open = isRegistrationOpen(settings, now);
          if (!open.open) {
            return {
              ok: false as const,
              code: open.reason === "DEADLINE_PASSED" ? ("DEADLINE_PASSED" as const) : ("REGISTRATION_CLOSED" as const),
              message:
                open.reason === "DEADLINE_PASSED"
                  ? "The registration deadline has passed. Please contact the camp office."
                  : "Registration is currently closed. Please contact the camp office.",
            };
          }

          if (settings.capacity !== null && settings.capacity !== undefined) {
            const activeCount = await tx.participant.count({
              where: { registrationStatus: { not: "CANCELLED" } },
            });
            if (activeCount >= settings.capacity) {
              return {
                ok: false as const,
                code: "CAPACITY_REACHED" as const,
                message:
                  "Registration is full. The camp has reached its maximum capacity. Please contact the camp office.",
              };
            }
          }

          const dateOfBirth = new Date(`${input.dateOfBirth}T00:00:00.000Z`);

          const duplicate = await tx.participant.findFirst({
            where: {
              phone: input.phone,
              dateOfBirth,
              firstName: { equals: input.firstName, mode: "insensitive" },
              registrationStatus: { not: "CANCELLED" },
            },
            select: { id: true, registrationReference: true },
          });
          if (duplicate) {
            return {
              ok: false as const,
              code: "DUPLICATE_REGISTRATION" as const,
              message: `A registration already exists for this participant (${duplicate.registrationReference}). Please keep that reference.`,
              fieldErrors: { phone: "This participant already appears to be registered." } as Record<string, string>,
            };
          }

          let churchAssemblyId: string | null = null;
          if (input.churchAssemblyId) {
            const assembly = await tx.churchAssembly.findUnique({
              where: { id: input.churchAssemblyId },
            });
            if (!assembly || !assembly.isActive) {
              return {
                ok: false as const,
                code: "INVALID_ASSEMBLY" as const,
                message: "The selected church assembly is not available.",
                fieldErrors: { churchAssemblyId: "Select a valid church assembly." } as Record<string, string>,
              };
            }
            churchAssemblyId = assembly.id;
          }

          const age = calculateAge(dateOfBirth, now);
          const isMinor = age < 18;

          const reference = await nextRegistrationReference(tx, now.getFullYear());
          const feeRequired =
            settings.registrationFee !== null &&
            settings.registrationFee !== undefined &&
            Number(settings.registrationFee) > 0;

          const participant = await tx.participant.create({
            data: {
              registrationReference: reference,
              idempotencyKey: input.idempotencyKey,
              firstName: input.firstName,
              middleName: input.middleName || null,
              lastName: input.lastName,
              dateOfBirth,
              gender: input.gender,
              phone: input.phone,
              email: input.email || null,
              address: input.address || null,
              state: input.state,
              town: input.town,
              churchAssemblyId,
              pastorName: input.pastorName || null,
              pastorPhone: input.pastorPhone || null,
              participantCategory: input.participantCategory || null,
              tShirtSize: input.tShirtSize || null,
              dietaryRequirements: input.dietaryRequirements || null,
              assistanceRequirements: input.assistanceRequirements || null,
              additionalInformation: input.additionalInformation || null,
              emergencyContactName: input.emergencyContactName,
              emergencyContactRelationship: input.emergencyContactRelationship,
              emergencyContactPhone: input.emergencyContactPhone,
              isMinor,
              guardianName: input.guardianName || null,
              guardianPhone: input.guardianPhone || null,
              guardianConsentAt: isMinor ? now : null,
              accuracyConsentAt: now,
              termsAcceptedAt: now,
              privacyNoticeVersion: settings.privacyNoticeVersion,
              registrationStatus: "REGISTERED",
              paymentStatus: feeRequired ? "UNPAID" : "NOT_REQUIRED",
              registeredAt: now,
            },
          });

          return { ok: true as const, participant, created: true };
        },
        // Capacity checks are serialised by the `SELECT ... FOR UPDATE` row lock
        // on CampSettings, so the default isolation level is sufficient.
        { maxWait: 10000, timeout: 15000 },
      );
    } catch (error) {
      if (isSerializationError(error) && attempt < MAX_RETRIES - 1) {
        continue;
      }
      // Unknown database errors are surfaced with a generic message.
      // The real error is logged server-side only.
      console.error("createRegistration failed", error);
      return {
        ok: false,
        code: "DATABASE_UNAVAILABLE",
        message: "We could not save your registration right now. Please try again shortly.",
      };
    }
  }

  return {
    ok: false,
    code: "CAPACITY_REACHED",
    message: "High demand right now. Please try again in a moment.",
  };
}
