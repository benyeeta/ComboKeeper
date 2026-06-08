'use server';

import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';

export async function saveScoresToDatabase(scores: any[]) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const user = sessionCookie ? await decrypt(sessionCookie) : null;
  if (!user) throw new Error("Unauthorized");

  if (!Array.isArray(scores) || scores.length === 0) {
    return { success: false, message: 'No scores provided' };
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

    console.log(`Successfully received ${scores.length} scores on the backend!`);
    return { success: true, count: scores.length };
  } catch (error) {
    console.error('Failed to save scores:', error);
    throw new Error('Failed to save scores to the database');
  }
}
