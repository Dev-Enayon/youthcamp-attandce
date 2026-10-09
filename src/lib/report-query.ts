import { z } from "zod";
import type { Gender, RegistrationStatus } from "@prisma/client";
import type { ParticipantListFilters } from "@/server/services/participants";
import { GENDERS, REGISTRATION_STATUSES } from "@/lib/validation/registration";

export type SearchParams = Record<string, string | string[] | undefined>;

export function parseParticipantFilters(
  sp: SearchParams,
  pageSize?: number,
): ParticipantListFilters {
  const single = (key: string) => {
    const value = sp[key];
    return typeof value === "string" && value !== "" ? value : undefined;
  };
  // Validate open-ended filter params so tampered values cannot reach Prisma
  // (which would otherwise throw a validation error and return a 500).
  const status = single("status");
  const gender = single("gender");
  return {
    search: single("search"),
    status:
      status !== undefined && z.enum(REGISTRATION_STATUSES).safeParse(status).success
        ? (status as RegistrationStatus)
        : undefined,
    gender:
      gender !== undefined && z.enum(GENDERS).safeParse(gender).success
        ? (gender as Gender)
        : undefined,
    category: single("category"),
    assemblyId: single("assemblyId"),
    dateFrom: single("dateFrom"),
    dateTo: single("dateTo"),
    page: Number(single("page") ?? 1) || 1,
    pageSize,
  };
}

export function filtersToQuery(
  filters: Partial<ParticipantListFilters> & Record<string, unknown>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}
