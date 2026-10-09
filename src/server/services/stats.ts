import type { PrismaClient, RegistrationStatus } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db";
import { endOfLagosDay, endOfLagosWeek, startOfLagosDay, startOfLagosWeek } from "@/lib/timezone";

export interface DashboardStats {
  totalActive: number;
  today: number;
  thisWeek: number;
  byGender: { male: number; female: number; undisclosed: number };
  byStatus: Record<RegistrationStatus, number>;
  byCategory: { category: string; count: number }[];
  byAssembly: { id: string; name: string; branch: string | null; count: number }[];
  recent: {
    id: string;
    registrationReference: string;
    firstName: string;
    lastName: string;
    participantCategory: string | null;
    registeredAt: Date;
    registrationStatus: RegistrationStatus;
  }[];
}

export async function getDashboardStats(
  db: PrismaClient = defaultDb,
  now: Date = new Date(),
): Promise<DashboardStats> {
  const dayStart = startOfLagosDay(now);
  const dayEnd = endOfLagosDay(now);
  const weekStart = startOfLagosWeek(now);
  const weekEnd = endOfLagosWeek(now);

  const activeWhere = { registrationStatus: { not: "CANCELLED" as const } };

  const [
    totalActive,
    today,
    thisWeek,
    male,
    female,
    undisclosed,
    statusGroups,
    categoryGroups,
    assemblies,
    recent,
  ] = await Promise.all([
    db.participant.count({ where: activeWhere }),
    db.participant.count({ where: { ...activeWhere, registeredAt: { gte: dayStart, lt: dayEnd } } }),
    db.participant.count({ where: { ...activeWhere, registeredAt: { gte: weekStart, lt: weekEnd } } }),
    db.participant.count({ where: { ...activeWhere, gender: "MALE" } }),
    db.participant.count({ where: { ...activeWhere, gender: "FEMALE" } }),
    db.participant.count({ where: { ...activeWhere, gender: "PREFER_NOT_TO_SAY" } }),
    db.participant.groupBy({ by: ["registrationStatus"], _count: { _all: true } }),
    db.participant.groupBy({
      by: ["participantCategory"],
      where: activeWhere,
      _count: { _all: true },
    }),
    db.churchAssembly.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { participants: { where: activeWhere } },
        },
      },
    }),
    db.participant.findMany({
      orderBy: { registeredAt: "desc" },
      take: 8,
      select: {
        id: true,
        registrationReference: true,
        firstName: true,
        lastName: true,
        participantCategory: true,
        registeredAt: true,
        registrationStatus: true,
      },
    }),
  ]);

  const byStatus: Record<RegistrationStatus, number> = {
    REGISTERED: 0,
    CONFIRMED: 0,
    CANCELLED: 0,
  };
  for (const group of statusGroups) {
    byStatus[group.registrationStatus] = group._count._all;
  }

  return {
    totalActive,
    today,
    thisWeek,
    byGender: { male, female, undisclosed },
    byStatus,
    byCategory: categoryGroups
      .map((group) => ({
        category: group.participantCategory ?? "Unspecified",
        count: group._count._all,
      }))
      .sort((a, b) => b.count - a.count),
    byAssembly: assemblies
      .map((assembly) => ({
        id: assembly.id,
        name: assembly.name,
        branch: assembly.branch,
        count: assembly._count.participants,
      }))
      .sort((a, b) => b.count - a.count),
    recent,
  };
}
