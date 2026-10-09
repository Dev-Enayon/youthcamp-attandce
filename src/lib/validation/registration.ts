import { z } from "zod";
import { isValidNigerianPhone, normalizeNigerianPhone } from "@/lib/phone";
import { calculateAge } from "@/lib/utils";

export const GENDERS = ["MALE", "FEMALE", "PREFER_NOT_TO_SAY"] as const;
export type GenderValue = (typeof GENDERS)[number];

export const REGISTRATION_STATUSES = ["REGISTERED", "CONFIRMED", "CANCELLED"] as const;

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT - Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "Outside Nigeria",
] as const;

const dobSchema = z
  .string({ message: "Date of birth is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Use a valid date (YYYY-MM-DD)" })
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, { message: "Enter a real calendar date" })
  .refine((value) => new Date(`${value}T00:00:00.000Z`).getTime() <= Date.now(), {
    message: "Date of birth cannot be in the future",
  })
  .refine((value) => calculateAge(new Date(`${value}T00:00:00.000Z`)) <= 120, {
    message: "Please check the date of birth",
  });

const phoneSchema = z
  .string({ message: "Phone number is required" })
  .min(1, { message: "Phone number is required" })
  .refine((value) => isValidNigerianPhone(value), {
    message: "Enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678)",
  })
  .transform((value) => normalizeNigerianPhone(value) as string);

const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : ""))
  .refine((value) => value === "" || isValidNigerianPhone(value), {
    message: "Enter a valid Nigerian phone number",
  })
  .transform((value) => (value === "" ? "" : (normalizeNigerianPhone(value) as string)));

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : ""))
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Enter a valid email address",
  })
  .transform((value) => (value === "" ? "" : value.toLowerCase()));

const text = (max = 500) => z.string().trim().max(max, { message: `Must be ${max} characters or fewer` });

export interface RegistrationRequirements {
  requireEmail?: boolean;
  requireAddress?: boolean;
  requireChurchAssembly?: boolean;
  requirePastorName?: boolean;
  requirePastorPhone?: boolean;
  requireCategory?: boolean;
  requireTShirt?: boolean;
  categories?: string[];
  tShirtSizes?: string[];
}

const DEFAULT_REQUIREMENTS: RegistrationRequirements = {
  requireEmail: false,
  requireAddress: false,
  requireChurchAssembly: false,
  requirePastorName: false,
  requirePastorPhone: false,
  requireCategory: true,
  requireTShirt: false,
};

export function buildRegistrationSchema(req: RegistrationRequirements = {}) {
  const r = { ...DEFAULT_REQUIREMENTS, ...req };

  const emailField = r.requireEmail
    ? optionalEmailSchema.refine((v) => v !== "", { message: "Email address is required" })
    : optionalEmailSchema;

  const addressField = r.requireAddress
    ? text(300).min(1, { message: "Home address is required" })
    : text(300).optional().transform((v) => v ?? "");

  const churchAssemblyField = r.requireChurchAssembly
    ? z.string().min(1, { message: "Please select your church assembly" })
    : z.string().optional().transform((v) => v ?? "");

  const pastorNameField = r.requirePastorName
    ? text(120).min(1, { message: "Pastor / fellowship leader name is required" })
    : text(120).optional().transform((v) => v ?? "");

  const pastorPhoneField = r.requirePastorPhone
    ? optionalPhoneSchema.refine((v) => v !== "", { message: "Pastor / fellowship leader phone is required" })
    : optionalPhoneSchema;

  const categoryField = r.requireCategory
    ? z.string().min(1, { message: "Please select a participant category" })
    : z.string().optional().transform((v) => v ?? "");

  const tShirtField = r.requireTShirt
    ? z.string().min(1, { message: "Please select a T-shirt size" })
    : z.string().optional().transform((v) => v ?? "");

  return z
    .object({
      firstName: text(60).min(1, { message: "First name is required" }),
      middleName: text(60).optional().transform((v) => v ?? ""),
      lastName: text(60).min(1, { message: "Last name is required" }),
      dateOfBirth: dobSchema,
      gender: z.enum(GENDERS, { message: "Select a gender option" }).default("PREFER_NOT_TO_SAY"),
      phone: phoneSchema,
      email: emailField,
      address: addressField,
      state: z.string().min(1, { message: "State of residence is required" }),
      town: text(80).min(1, { message: "Town / area is required" }),

      churchAssemblyId: churchAssemblyField,
      pastorName: pastorNameField,
      pastorPhone: pastorPhoneField,

      emergencyContactName: text(120).min(1, { message: "Emergency contact name is required" }),
      emergencyContactRelationship: text(60).min(1, { message: "Relationship is required" }),
      emergencyContactPhone: phoneSchema,

      participantCategory: categoryField,
      tShirtSize: tShirtField,
      dietaryRequirements: text(500).optional().transform((v) => v ?? ""),
      assistanceRequirements: text(500).optional().transform((v) => v ?? ""),
      additionalInformation: text(1000).optional().transform((v) => v ?? ""),

      guardianName: text(120).optional().transform((v) => v ?? ""),
      guardianPhone: optionalPhoneSchema,
      guardianConsent: z.boolean().optional().default(false),

      accuracyConsent: z.boolean().refine((v) => v === true, {
        message: "Please confirm the information provided is accurate",
      }),
      termsAccepted: z.boolean().refine((v) => v === true, {
        message: "You must accept the registration terms",
      }),
      privacyAcknowledged: z.boolean().refine((v) => v === true, {
        message: "Please acknowledge the privacy notice",
      }),

      idempotencyKey: z.string().trim().min(8).max(100),
    })
    .superRefine((data, ctx) => {
      const age = calculateAge(new Date(`${data.dateOfBirth}T00:00:00.000Z`));
      const isMinor = age < 18;

      if (isMinor) {
        if (!data.guardianName) {
          ctx.addIssue({
            code: "custom",
            path: ["guardianName"],
            message: "Parent / guardian name is required for participants under 18",
          });
        }
        if (!data.guardianPhone) {
          ctx.addIssue({
            code: "custom",
            path: ["guardianPhone"],
            message: "Parent / guardian phone is required for participants under 18",
          });
        }
        if (data.guardianConsent !== true) {
          ctx.addIssue({
            code: "custom",
            path: ["guardianConsent"],
            message: "Parent / guardian consent is required for participants under 18",
          });
        }
      }

      if (r.categories && r.categories.length > 0 && data.participantCategory) {
        if (!r.categories.includes(data.participantCategory)) {
          ctx.addIssue({
            code: "custom",
            path: ["participantCategory"],
            message: "Select one of the available categories",
          });
        }
      }
      if (r.tShirtSizes && r.tShirtSizes.length > 0 && data.tShirtSize) {
        if (!r.tShirtSizes.includes(data.tShirtSize)) {
          ctx.addIssue({
            code: "custom",
            path: ["tShirtSize"],
            message: "Select one of the available T-shirt sizes",
          });
        }
      }
    });
}

export type RegistrationInput = z.infer<ReturnType<typeof buildRegistrationSchema>>;

/** Flatten a Zod error into a `{ field: message }` map for the client. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
