import { randomUUID } from "node:crypto";
import type { AdminRole, Gender, RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { buildRegistrationSchema, type RegistrationInput } from "@/lib/validation/registration";

export const TABLES = [
  "ParticipantNote",
  "StatusChange",
  "AdminAuditLog",
  "Participant",
  "ChurchAssembly",
  "CampSettings",
  "RegistrationCounter",
  "RateLimitEntry",
  "AdminUser",
];

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE;`,
  );
}

export async function createSettings(overrides: Record<string, unknown> = {}) {
  return prisma.campSettings.create({
    data: {
      registrationOpen: true,
      categories: ["Youth", "Teenager", "Other"],
      tShirtSizes: ["S", "M", "L", "XL", "XXL"],
      ...overrides,
    },
  });
}

export async function createAssembly(name = "Gospel Of Truth Mission", branch = "Lagos Ogun Badagry") {
  return prisma.churchAssembly.create({ data: { name, branch } });
}

export async function createAdmin(role: AdminRole = "ADMIN", email = `${role.toLowerCase()}-${randomUUID()}@example.com`) {
  const passwordHash = await hashPassword("Password!123");
  return prisma.adminUser.create({
    data: { name: "Test Admin", email, passwordHash, role, isActive: true },
  });
}

export async function createParticipant(
  overrides: {
    registrationReference?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string | null;
    participantCategory?: string;
    churchAssemblyId?: string | null;
    gender?: Gender;
    registrationStatus?: RegistrationStatus;
    dateOfBirth?: string;
    registeredAt?: Date;
  } = {},
) {
  const dob = overrides.dateOfBirth ?? "2008-05-01";
  return prisma.participant.create({
    data: {
      registrationReference: overrides.registrationReference ?? `GTM-YC-2026-${randomUUID().slice(0, 5)}`,
      idempotencyKey: randomUUID(),
      firstName: overrides.firstName ?? "Test",
      lastName: overrides.lastName ?? "Participant",
      dateOfBirth: new Date(`${dob}T00:00:00.000Z`),
      gender: overrides.gender ?? "MALE",
      phone: overrides.phone ?? `+234${Math.floor(10_000_000 + Math.random() * 89_999_999)}`,
      email: overrides.email ?? null,
      state: "Lagos",
      town: "Badagry",
      churchAssemblyId: overrides.churchAssemblyId ?? null,
      participantCategory: overrides.participantCategory ?? "Youth",
      emergencyContactName: "Emergency Contact",
      emergencyContactRelationship: "Parent",
      emergencyContactPhone: "+2348011111111",
      accuracyConsentAt: new Date(),
      termsAcceptedAt: new Date(),
      privacyNoticeVersion: "1.0",
      registrationStatus: overrides.registrationStatus ?? "REGISTERED",
      registeredAt: overrides.registeredAt ?? new Date(),
    },
  });
}

export function makeRegistrationInput(overrides: Partial<RegistrationInput> = {}): RegistrationInput {
  const schema = buildRegistrationSchema();
  const base = {
    firstName: "Ada",
    middleName: "",
    lastName: "Okafor",
    dateOfBirth: "2008-05-01",
    gender: "FEMALE" as const,
    phone: "08012345678",
    email: "",
    address: "",
    state: "Lagos",
    town: "Badagry",
    churchAssemblyId: "",
    pastorName: "",
    pastorPhone: "",
    emergencyContactName: "Chinedu Okafor",
    emergencyContactRelationship: "Parent",
    emergencyContactPhone: "08087654321",
    participantCategory: "Youth",
    tShirtSize: "M",
    dietaryRequirements: "",
    assistanceRequirements: "",
    additionalInformation: "",
    guardianName: "",
    guardianPhone: "",
    guardianConsent: false,
    accuracyConsent: true,
    termsAccepted: true,
    privacyAcknowledged: true,
    idempotencyKey: randomUUID(),
    ...overrides,
  };
  // Return the validated (normalised) input when valid, but fall back to the
  // raw value so tests can intentionally construct invalid payloads.
  const parsed = schema.safeParse(base);
  return parsed.success ? parsed.data : (base as RegistrationInput);
}
