"use server";

import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { getStageScores, getTournamentData } from "@/lib/queries";
import type { TournamentInitialData } from "@/lib/queries";
import type { ScoreData } from "@/lib/types";

export async function fetchTournamentDataForClient(
  tournamentId?: string,
): Promise<{ data: TournamentInitialData | null; error?: string }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const user = sessionCookie ? await decrypt(sessionCookie) : null;

  if (!user) {
    return { data: null, error: "unauthorized" };
  }

  const data = await getTournamentData(user.id, tournamentId);
  return {
    data: {
      ...data,
      currentUser: { id: user.id, username: user.username },
    },
  };
}

export async function fetchStageScoresForClient(
  tournamentId: string,
  stageId: string,
): Promise<{ scores: ScoreData[] | null; error?: string }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const user = sessionCookie ? await decrypt(sessionCookie) : null;

  if (!user) {
    return { scores: null, error: "unauthorized" };
  }

  const scores = await getStageScores(user.id, tournamentId, stageId);
  return { scores };
}
