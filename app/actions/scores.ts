'use server';

import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { ratelimit } from '@/lib/ratelimit';

export async function saveScoresToDatabase(
  scores: { score: number; accuracy?: number; scoreType?: string; playerId: number; mappoolMapId: string; playedMod?: string; timestamp?: string | Date; isFc?: boolean }[],
  tournamentId: string,
) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;
  if (!currentUser) throw new Error("Unauthorized");

  if (!tournamentId) throw new Error("Tournament ID is required");
  if (!Array.isArray(scores) || scores.length === 0) {
    return { success: false, message: 'No scores provided' };
  }

  const membership = await prisma.tournamentTeam.findFirst({
    where: {
      tournamentId,
      team: { players: { some: { playerId: currentUser.id, status: "ACCEPTED" } } },
    },
    include: { team: { include: { players: { where: { status: "ACCEPTED" } } } } },
  });
  if (!membership) throw new Error("Forbidden: You must be an accepted team member.");

  const { success: withinLimit } = await ratelimit.limit(`saveScores_${currentUser.id}`);
  if (!withinLimit) throw new Error("You are saving scores too fast. Please wait.");

  const teamPlayerIds = new Set(membership.team.players.map((p) => p.playerId));
  const tournamentMapIds = new Set(
    (
      await prisma.mappoolMap.findMany({
        where: { stage: { tournamentId } },
        select: { id: true },
      })
    ).map((m) => m.id),
  );

  for (const s of scores) {
    if (s.playerId !== currentUser.id && !teamPlayerIds.has(s.playerId)) {
      throw new Error("Forbidden: Scores must be for yourself or a teammate.");
    }
    if (!tournamentMapIds.has(s.mappoolMapId)) {
      throw new Error("Forbidden: Invalid map for this tournament.");
    }
  }

  try {
    await prisma.score.createMany({
      data: scores.map(s => ({
        score: s.score,
        accuracy: s.accuracy || 0,
        scoreType: s.scoreType || "PRACTICE",
        playerId: s.playerId,
        mappoolMapId: s.mappoolMapId,
        playedMod: s.playedMod,
        timestamp: s.timestamp ? new Date(s.timestamp) : new Date(),
        isFc: s.isFc ?? false
      })),
      skipDuplicates: true
    });

    return { success: true, count: scores.length };
  } catch (error) {
    console.error('Failed to save scores:', error);
    throw new Error('Failed to save scores to the database');
  }
}
