CREATE TYPE "ReportScheduleFrequency" AS ENUM ('ONCE', 'WEEKLY');

CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "frequency" "ReportScheduleFrequency" NOT NULL,
    "weekday" INTEGER,
    "scheduledDate" TIMESTAMP(3),
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "filtersSince" TEXT NOT NULL,
    "filtersUntil" TEXT NOT NULL,
    "objective" TEXT NOT NULL DEFAULT 'ALL',
    "sendMode" TEXT NOT NULL DEFAULT 'PDF_AND_MESSAGE',
    "message" TEXT,
    "groupId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportSchedule_clientId_key" ON "ReportSchedule"("clientId");
CREATE INDEX "ReportSchedule_active_nextRunAt_idx" ON "ReportSchedule"("active", "nextRunAt");

ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
