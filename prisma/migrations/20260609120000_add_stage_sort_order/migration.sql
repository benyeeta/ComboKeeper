-- AlterTable
ALTER TABLE "Stage" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill sort order from creation time per tournament
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "tournamentId" ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "Stage"
)
UPDATE "Stage"
SET "sortOrder" = ranked.rn
FROM ranked
WHERE "Stage".id = ranked.id;
