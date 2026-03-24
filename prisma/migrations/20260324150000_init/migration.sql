CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER');
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE "SendLogStatus" AS ENUM ('PENDING', 'OK', 'FAILED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "avatarUrl" TEXT,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'MANAGER',
  "metaAccessToken" TEXT,
  "metaTokenExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Client" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "company" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "notes" TEXT,
  "whatsappGroupId" TEXT,
  "adAccountId" TEXT,
  "adAccountName" TEXT,
  "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "managerId" TEXT,

  CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientCampaign" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "clientId" TEXT NOT NULL,
  "campaignIdMeta" TEXT NOT NULL,
  "campaignName" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "ClientCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Report" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "clientId" TEXT NOT NULL,
  "referenceWeek" TIMESTAMP(3) NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
  "payloadJson" JSONB,

  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SendLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "reportId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" "SendLogStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "SendLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Client_managerId_status_idx" ON "Client"("managerId", "status");
CREATE INDEX "Client_adAccountId_idx" ON "Client"("adAccountId");
CREATE UNIQUE INDEX "ClientCampaign_clientId_campaignIdMeta_key" ON "ClientCampaign"("clientId", "campaignIdMeta");
CREATE INDEX "ClientCampaign_clientId_isActive_idx" ON "ClientCampaign"("clientId", "isActive");
CREATE INDEX "Report_clientId_generatedAt_idx" ON "Report"("clientId", "generatedAt");
CREATE INDEX "Report_status_generatedAt_idx" ON "Report"("status", "generatedAt");
CREATE INDEX "Report_referenceWeek_idx" ON "Report"("referenceWeek");
CREATE UNIQUE INDEX "SendLog_reportId_attemptNumber_key" ON "SendLog"("reportId", "attemptNumber");
CREATE INDEX "SendLog_reportId_status_idx" ON "SendLog"("reportId", "status");
CREATE INDEX "SendLog_sentAt_idx" ON "SendLog"("sentAt");

ALTER TABLE "Client"
ADD CONSTRAINT "Client_managerId_fkey"
FOREIGN KEY ("managerId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "ClientCampaign"
ADD CONSTRAINT "ClientCampaign_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "Report"
ADD CONSTRAINT "Report_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "SendLog"
ADD CONSTRAINT "SendLog_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "Report"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
