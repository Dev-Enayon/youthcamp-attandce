import { Prisma, type Participant, type PrismaClient, type RegistrationStatus } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db";
import { recordAudit } from "@/server/services/audit";
import { endOfLagosDay, startOfLagosDay } from "@/lib/timezone";

export interface ParticipantListFilters {
  search?: string;
  status?: RegistrationStatus;
  gender?: "MALE" | "FEMALE" | "PREFER_NOT_TO_SAY";
  category?: string;
  assemblyId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ParticipantListResult {
  items: (Participant & { churchAssembly: { name: string; branch: string | null } | null })[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function buildParticipantWhere(filters: ParticipantListFilters): Prisma.ParticipantWhereInput {
  const where: Prisma.ParticipantWhereInput = {};
  const and: Prisma.ParticipantWhereInput[] = [];

  const search = filters.search?.trim();
  if (search) {
    and.push({
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { middleName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { registrationReference: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (filters.status) where.registrationStatus = filters.status;
  if (filters.gender) where.gender = filters.gender;
  if (filters.category) where.participantCategory = filters.category;
  if (filters.assemblyId) where.churchAssemblyId = filters.assemblyId;

  if (filters.dateFrom || filters.dateTo) {
    const range: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) {
      const from = new Date(`${filters.dateFrom}T00:00:00.000Z`);
      if (!Number.isNaN(from.getTime())) range.gte = startOfLagosDay(from);
    }
    if (filters.dateTo) {
      const to = new Date(`${filters.dateTo}T00:00:00.000Z`);
      if (!Number.isNaN(to.getTime())) range.lt = endOfLagosDay(to);
    }
    if (range.gte || range.lt) where.registeredAt = range;
  }

  if (and.length) where.AND = and;
  return where;
}

export async function listParticipants(
  filters: ParticipantListFilters,
  db: PrismaClient = defaultDb,
): Promise<ParticipantListResult> {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(filters.pageSize) || DEFAULT_PAGE_SIZE));
  const where = buildParticipantWhere(filters);

  const [total, items] = await Promise.all([
    db.participant.count({ where }),
    db.participant.findMany({
      where,
      orderBy: { registeredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { churchAssembly: { select: { name: true, branch: true } } },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getParticipantsForExport(
  filters: ParticipantListFilters,
  db: PrismaClient = defaultDb,
) {
  return db.participant.findMany({
    where: buildParticipantWhere(filters),
    orderBy: { registeredAt: "desc" },
    include: { churchAssembly: { select: { name: true, branch: true } } },
  });
}

export async function getParticipant(id: string, db: PrismaClient = defaultDb) {
  return db.participant.findUnique({
    where: { id },
    include: {
      churchAssembly: true,
      notes: { orderBy: { createdAt: "desc" }, include: { adminUser: { select: { name: true } } } },
      statusChanges: { orderBy: { createdAt: "desc" }, include: { adminUser: { select: { name: true } } } },
    },
  });
}

export interface ParticipantUpdateData {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "PREFER_NOT_TO_SAY";
  phone: string;
  email?: string;
  address?: string;
  state: string;
  town: string;
  churchAssemblyId?: string | null;
  pastorName?: string;
  pastorPhone?: string;
  participantCategory?: string;
  tShirtSize?: string;
  dietaryRequirements?: string;
  assistanceRequirements?: string;
  additionalInformation?: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  guardianName?: string;
  guardianPhone?: string;
}

export async function updateParticipant(
  id: string,
  data: ParticipantUpdateData,
  adminUserId: string,
  db: PrismaClient = defaultDb,
) {
  const existing = await db.participant.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new Error("NOT_FOUND");

  return db.$transaction(async (tx) => {
    const participant = await tx.participant.update({
      where: { id },
      data: {
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00.000Z`),
        gender: data.gender,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        state: data.state,
        town: data.town,
        churchAssemblyId: data.churchAssemblyId || null,
        pastorName: data.pastorName || null,
        pastorPhone: data.pastorPhone || null,
        participantCategory: data.participantCategory || null,
        tShirtSize: data.tShirtSize || null,
        dietaryRequirements: data.dietaryRequirements || null,
        assistanceRequirements: data.assistanceRequirements || null,
        additionalInformation: data.additionalInformation || null,
        emergencyContactName: data.emergencyContactName,
        emergencyContactRelationship: data.emergencyContactRelationship,
        emergencyContactPhone: data.emergencyContactPhone,
        guardianName: data.guardianName || null,
        guardianPhone: data.guardianPhone || null,
      },
    });

    await recordAudit(tx as unknown as PrismaClient, {
      adminUserId,
      action: "PARTICIPANT_UPDATED",
      entityType: "Participant",
      entityId: id,
    });

    return participant;
  });
}

export async function changeRegistrationStatus(
  id: string,
  toStatus: RegistrationStatus,
  reason: string | null,
  adminUserId: string,
  db: PrismaClient = defaultDb,
) {
  return db.$transaction(async (tx) => {
    const current = await tx.participant.findUnique({
      where: { id },
      select: { registrationStatus: true },
    });
    if (!current) throw new Error("NOT_FOUND");

    const participant = await tx.participant.update({
      where: { id },
      data: { registrationStatus: toStatus },
    });

    await tx.statusChange.create({
      data: {
        participantId: id,
        adminUserId,
        fromStatus: current.registrationStatus,
        toStatus,
        reason: reason || null,
      },
    });

    await recordAudit(tx as unknown as PrismaClient, {
      adminUserId,
      action: "STATUS_CHANGED",
      entityType: "Participant",
      entityId: id,
      reason,
      safeMetadata: { from: current.registrationStatus, to: toStatus },
    });

    return participant;
  });
}

export async function addParticipantNote(
  participantId: string,
  body: string,
  adminUserId: string,
  db: PrismaClient = defaultDb,
) {
  return db.$transaction(async (tx) => {
    const note = await tx.participantNote.create({
      data: { participantId, adminUserId, body },
    });
    await recordAudit(tx as unknown as PrismaClient, {
      adminUserId,
      action: "NOTE_ADDED",
      entityType: "Participant",
      entityId: participantId,
    });
    return note;
  });
}
