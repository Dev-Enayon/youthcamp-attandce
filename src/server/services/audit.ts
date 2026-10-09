import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db";

type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditInput {
  adminUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  /** Non-sensitive metadata only. Never store passwords or full records here. */
  safeMetadata?: Prisma.InputJsonValue | null;
}

export async function recordAudit(db: Db = defaultDb, input: AuditInput) {
  return db.adminAuditLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      reason: input.reason ?? null,
      safeMetadata: input.safeMetadata ?? undefined,
    },
  });
}
