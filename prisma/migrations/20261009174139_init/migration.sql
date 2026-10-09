-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'UNPAID', 'PAID', 'WAIVED');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampSettings" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "theme" TEXT,
    "bibleVerse" TEXT,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "venue" TEXT,
    "venueAddress" TEXT,
    "registrationDeadline" TIMESTAMP(3),
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "registrationFee" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER,
    "categories" TEXT[] DEFAULT ARRAY['Youth', 'Teenager', 'Other']::TEXT[],
    "tShirtSizes" TEXT[] DEFAULT ARRAY['S', 'M', 'L', 'XL', 'XXL']::TEXT[],
    "requiredFields" JSONB NOT NULL DEFAULT '{}',
    "privacyNotice" TEXT,
    "terms" TEXT,
    "privacyNoticeVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchAssembly" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branch" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChurchAssembly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "registrationReference" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'PREFER_NOT_TO_SAY',
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "state" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "churchAssemblyId" TEXT,
    "pastorName" TEXT,
    "pastorPhone" TEXT,
    "participantCategory" TEXT,
    "tShirtSize" TEXT,
    "dietaryRequirements" TEXT,
    "assistanceRequirements" TEXT,
    "additionalInformation" TEXT,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactRelationship" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "guardianConsentAt" TIMESTAMP(3),
    "accuracyConsentAt" TIMESTAMP(3) NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "privacyNoticeVersion" TEXT NOT NULL,
    "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantNote" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusChange" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "fromStatus" "RegistrationStatus",
    "toStatus" "RegistrationStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "reason" TEXT,
    "safeMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationCounter" (
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "RateLimitEntry" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitEntry_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_role_idx" ON "AdminUser"("role");

-- CreateIndex
CREATE INDEX "AdminUser_isActive_idx" ON "AdminUser"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ChurchAssembly_name_key" ON "ChurchAssembly"("name");

-- CreateIndex
CREATE INDEX "ChurchAssembly_isActive_idx" ON "ChurchAssembly"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_registrationReference_key" ON "Participant"("registrationReference");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_idempotencyKey_key" ON "Participant"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Participant_lastName_idx" ON "Participant"("lastName");

-- CreateIndex
CREATE INDEX "Participant_phone_idx" ON "Participant"("phone");

-- CreateIndex
CREATE INDEX "Participant_email_idx" ON "Participant"("email");

-- CreateIndex
CREATE INDEX "Participant_registeredAt_idx" ON "Participant"("registeredAt");

-- CreateIndex
CREATE INDEX "Participant_registrationStatus_idx" ON "Participant"("registrationStatus");

-- CreateIndex
CREATE INDEX "Participant_churchAssemblyId_idx" ON "Participant"("churchAssemblyId");

-- CreateIndex
CREATE INDEX "Participant_dateOfBirth_idx" ON "Participant"("dateOfBirth");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantCategory_name_key" ON "ParticipantCategory"("name");

-- CreateIndex
CREATE INDEX "ParticipantCategory_isActive_idx" ON "ParticipantCategory"("isActive");

-- CreateIndex
CREATE INDEX "ParticipantNote_participantId_idx" ON "ParticipantNote"("participantId");

-- CreateIndex
CREATE INDEX "ParticipantNote_adminUserId_idx" ON "ParticipantNote"("adminUserId");

-- CreateIndex
CREATE INDEX "StatusChange_participantId_idx" ON "StatusChange"("participantId");

-- CreateIndex
CREATE INDEX "StatusChange_adminUserId_idx" ON "StatusChange"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entityType_idx" ON "AdminAuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimitEntry_expiresAt_idx" ON "RateLimitEntry"("expiresAt");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_churchAssemblyId_fkey" FOREIGN KEY ("churchAssemblyId") REFERENCES "ChurchAssembly"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantNote" ADD CONSTRAINT "ParticipantNote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantNote" ADD CONSTRAINT "ParticipantNote_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusChange" ADD CONSTRAINT "StatusChange_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusChange" ADD CONSTRAINT "StatusChange_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
