CREATE TYPE "WeeklyReportDispatchStatus" AS ENUM ('PROCESSING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "WeeklyReportDispatch" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "reportId" TEXT,
    "reportWeekKey" TEXT NOT NULL,
    "filtersSince" TEXT NOT NULL,
    "filtersUntil" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "status" "WeeklyReportDispatchStatus" NOT NULL DEFAULT 'PROCESSING',
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "processingToken" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReportDispatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeeklyReportDispatch_clientId_reportWeekKey_key" ON "WeeklyReportDispatch"("clientId", "reportWeekKey");
CREATE INDEX "WeeklyReportDispatch_reportWeekKey_status_idx" ON "WeeklyReportDispatch"("reportWeekKey", "status");
CREATE INDEX "WeeklyReportDispatch_status_updatedAt_idx" ON "WeeklyReportDispatch"("status", "updatedAt");

ALTER TABLE "WeeklyReportDispatch" ADD CONSTRAINT "WeeklyReportDispatch_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyReportDispatch" ADD CONSTRAINT "WeeklyReportDispatch_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
