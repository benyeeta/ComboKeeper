-- CreateTable
CREATE TABLE "PlayerTrophy" (
    "id" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "trophyKey" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL DEFAULT 'lifetime',
    "metadata" JSONB,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerTrophy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerTrophy_playerId_trophyKey_scopeId_key" ON "PlayerTrophy"("playerId", "trophyKey", "scopeId");

-- AddForeignKey
ALTER TABLE "PlayerTrophy" ADD CONSTRAINT "PlayerTrophy_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
