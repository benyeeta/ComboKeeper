import prisma from "@/lib/prisma";
import type { PlayerTrophyResult } from "@/lib/trophies/playerTrophies";

const LIFETIME_SCOPE = "lifetime";

export async function syncPlayerTrophies(playerId: number, result: PlayerTrophyResult): Promise<void> {
  for (const trophy of result.lifetime) {
    await prisma.playerTrophy.upsert({
      where: {
        playerId_trophyKey_scopeId: {
          playerId,
          trophyKey: trophy.key,
          scopeId: LIFETIME_SCOPE,
        },
      },
      create: {
        playerId,
        trophyKey: trophy.key,
        scopeId: LIFETIME_SCOPE,
        metadata: { title: trophy.title, description: trophy.description },
      },
      update: {
        metadata: { title: trophy.title, description: trophy.description },
      },
    });
  }

  for (const group of result.byTournament) {
    for (const trophy of group.trophies) {
      await prisma.playerTrophy.upsert({
        where: {
          playerId_trophyKey_scopeId: {
            playerId,
            trophyKey: trophy.key,
            scopeId: group.tournamentId,
          },
        },
        create: {
          playerId,
          trophyKey: trophy.key,
          scopeId: group.tournamentId,
          metadata: {
            title: trophy.title,
            description: trophy.description,
            tournamentName: group.tournamentName,
          },
        },
        update: {
          metadata: {
            title: trophy.title,
            description: trophy.description,
            tournamentName: group.tournamentName,
          },
        },
      });
    }
  }
}

export async function getPersistedLifetimeTrophies(playerId: number) {
  return prisma.playerTrophy.findMany({
    where: { playerId, scopeId: LIFETIME_SCOPE },
    orderBy: { earnedAt: "asc" },
  });
}
