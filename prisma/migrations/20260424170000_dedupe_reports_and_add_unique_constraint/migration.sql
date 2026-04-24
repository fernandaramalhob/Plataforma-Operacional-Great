-- Keep a single report per client/week before enforcing uniqueness.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "clientId", "referenceWeek"
      ORDER BY
        CASE WHEN "status" = 'SENT' THEN 1 ELSE 0 END DESC,
        "generatedAt" DESC,
        id DESC
    ) AS rn
  FROM "Report"
)
DELETE FROM "SendLog"
WHERE "reportId" IN (
  SELECT id
  FROM ranked
  WHERE rn > 1
);

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "clientId", "referenceWeek"
      ORDER BY
        CASE WHEN "status" = 'SENT' THEN 1 ELSE 0 END DESC,
        "generatedAt" DESC,
        id DESC
    ) AS rn
  FROM "Report"
)
DELETE FROM "Report"
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX "Report_clientId_referenceWeek_key"
ON "Report"("clientId", "referenceWeek");
