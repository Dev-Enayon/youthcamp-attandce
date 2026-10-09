import { z } from "zod";
import { isValidNigerianPhone, normalizeNigerianPhone } from "@/lib/phone";
import { GENDERS, REGISTRATION_STATUSES } from "@/lib/validation/registration";

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional()).transform((v) => v ?? "");

const optionalPhone = z
  .preprocess(emptyToNull, z.string().nullable().optional())
  .transform((v) => v ?? "")
  .refine((v) => v === "" || isValidNigerianPhone(v), { message: "Enter a valid Nigerian phone number" })
  .transform((v) => (v === "" ? "" : (normalizeNigerianPhone(v) as string)));

const optionalDate = z
  .preprocess(emptyToNull, z.string().nullable().optional())
  .transform((v) => v ?? "")
  .refine(
    (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v) || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v),
    { message: "Enter a valid date" },
  )
  .transform((v) => (v === "" ? null : v));

export const adminLoginSchema = z.object({
  email: z.string().trim().min(1, { message: "Email is required" }).email({ message: "Enter a valid email" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export const participantUpdateSchema = z.object({
  firstName: z.string().trim().min(1, { message: "First name is required" }).max(60),
  middleName: optionalText(60),
  lastName: z.string().trim().min(1, { message: "Last name is required" }).max(60),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Use YYYY-MM-DD" })
    .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00.000Z`).getTime()), {
      message: "Enter a real date",
    }),
  gender: z.enum(GENDERS),
  phone: z
    .string()
    .min(1, { message: "Phone is required" })
    .refine((v) => isValidNigerianPhone(v), { message: "Enter a valid Nigerian phone number" })
    .transform((v) => normalizeNigerianPhone(v) as string),
  email: z
    .preprocess(emptyToNull, z.string().nullable().optional())
    .transform((v) => (v ?? "").toLowerCase())
    .refine((v) => v === "" || z.email().safeParse(v).success, { message: "Enter a valid email" }),
  address: optionalText(300),
  state: z.string().trim().min(1, { message: "State is required" }),
  town: z.string().trim().min(1, { message: "Town is required" }).max(80),
  churchAssemblyId: z.preprocess(emptyToNull, z.string().nullable().optional()).transform((v) => v ?? null),
  pastorName: optionalText(120),
  pastorPhone: optionalPhone,
  participantCategory: optionalText(60),
  tShirtSize: optionalText(20),
  dietaryRequirements: optionalText(500),
  assistanceRequirements: optionalText(500),
  additionalInformation: optionalText(1000),
  emergencyContactName: z.string().trim().min(1, { message: "Emergency contact name is required" }).max(120),
  emergencyContactRelationship: z.string().trim().min(1, { message: "Relationship is required" }).max(60),
  emergencyContactPhone: z
    .string()
    .min(1, { message: "Emergency contact phone is required" })
    .refine((v) => isValidNigerianPhone(v), { message: "Enter a valid Nigerian phone number" })
    .transform((v) => normalizeNigerianPhone(v) as string),
  guardianName: optionalText(120),
  guardianPhone: optionalPhone,
});

export const statusChangeSchema = z.object({
  participantId: z.string().min(1),
  status: z.enum(REGISTRATION_STATUSES),
  reason: z.string().trim().max(300).optional().default(""),
});

export const noteSchema = z.object({
  participantId: z.string().min(1),
  body: z.string().trim().min(1, { message: "Note cannot be empty" }).max(2000),
});

export const settingsSchema = z
  .object({
    title: z.string().trim().max(120).optional().default(""),
    theme: z.string().trim().max(160).optional().default(""),
    bibleVerse: z.string().trim().max(300).optional().default(""),
    description: z.string().trim().max(4000).optional().default(""),
    startDate: optionalDate,
    endDate: optionalDate,
    venue: z.string().trim().max(200).optional().default(""),
    venueAddress: z.string().trim().max(300).optional().default(""),
    registrationDeadline: optionalDate,
    contactPhone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .default("")
      .refine((v) => v === "" || isValidNigerianPhone(v), {
        message: "Enter a valid Nigerian contact phone",
      }),
    contactEmail: z
      .string()
      .trim()
      .max(160)
      .optional()
      .default("")
      .refine((v) => v === "" || z.email().safeParse(v).success, { message: "Enter a valid email" }),
    registrationFee: z
      .union([z.coerce.number().min(0).max(100000000), z.literal("")])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : Number(v))),
    registrationOpen: z.coerce.boolean().optional().default(false),
    capacity: z
      .union([z.coerce.number().int().min(0).max(1000000), z.literal("")])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : Number(v))),
    categories: z.array(z.string().trim().min(1).max(60)).min(1, { message: "Add at least one category" }),
    tShirtSizes: z.array(z.string().trim().min(1).max(20)),
    requiredFields: z
      .object({
        requireEmail: z.coerce.boolean().default(false),
        requireAddress: z.coerce.boolean().default(false),
        requireChurchAssembly: z.coerce.boolean().default(false),
        requirePastorName: z.coerce.boolean().default(false),
        requirePastorPhone: z.coerce.boolean().default(false),
        requireCategory: z.coerce.boolean().default(true),
        requireTShirt: z.coerce.boolean().default(false),
      })
      .default({
        requireEmail: false,
        requireAddress: false,
        requireChurchAssembly: false,
        requirePastorName: false,
        requirePastorPhone: false,
        requireCategory: true,
        requireTShirt: false,
      }),
    privacyNotice: z.string().trim().max(6000).optional().default(""),
    terms: z.string().trim().max(6000).optional().default(""),
    privacyNoticeVersion: z.string().trim().max(20).optional().default("1.0"),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: "End date cannot be before the start date",
    path: ["endDate"],
  });

export const assemblySchema = z.object({
  name: z.string().trim().min(1, { message: "Assembly name is required" }).max(120),
  branch: z.string().trim().max(120).optional().default(""),
  isActive: z.coerce.boolean().optional().default(true),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
export type ParticipantUpdateInput = z.infer<typeof participantUpdateSchema>;
