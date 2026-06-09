import {
  displayModFromPlay,
  getBestPlayMatching,
  getBestScoreMatching,
  isHDOnlyPlay,
  isHRPlay,
  isValidFMPlay,
  ModScoreHistory,
} from "@/lib/modSlots";
import { MMPlayer } from "@/lib/mmLineup";

export type FMLineupRole = "HD" | "HR" | "OPT";

export type FMLineupAssignment = {
  player: MMPlayer;
  role: FMLineupRole;
  score: number;
  displayMod: string;
};

export type FMLineupResult = {
  assignments: FMLineupAssignment[];
  totalScore: number;
  averageScore: number;
};

function getBestHDOnlyScore(history: ModScoreHistory[]): number {
  return getBestScoreMatching(history, isHDOnlyPlay);
}

function getBestHDOnlyPlay(history: ModScoreHistory[]) {
  return getBestPlayMatching(history, isHDOnlyPlay);
}

function getBestHRScore(history: ModScoreHistory[]): number {
  return getBestScoreMatching(history, isHRPlay);
}

function getBestHRPlay(history: ModScoreHistory[]) {
  return getBestPlayMatching(history, isHRPlay);
}

function getBestFMOptionalScore(history: ModScoreHistory[]): number {
  return getBestScoreMatching(history, isValidFMPlay);
}

function getBestFMOptionalPlay(history: ModScoreHistory[]) {
  return getBestPlayMatching(history, isValidFMPlay);
}

/**
 * OWC FreeMod: one HD player, one HR/HDHR player, remaining slots optional (NM/HD/HR/HDHR).
 * Optimizes player assignment for the given match format size (e.g. 4 for 4v4).
 */
export function calculateBestFMLineup(
  players: MMPlayer[],
  lineupSize: number
): FMLineupResult {
  const empty: FMLineupResult = { assignments: [], totalScore: 0, averageScore: 0 };
  if (players.length === 0 || lineupSize <= 0) return empty;

  if (lineupSize === 1 || players.length === 1) {
    const best = players
      .map((p) => {
        const play = getBestFMOptionalPlay(p.history);
        const score = play?.score ?? 0;
        return {
          player: p,
          role: "OPT" as const,
          score,
          displayMod: displayModFromPlay(play, "NM"),
        };
      })
      .sort((a, b) => b.score - a.score)[0];
    if (!best || best.score <= 0) return empty;
    return {
      assignments: [best],
      totalScore: best.score,
      averageScore: best.score / lineupSize,
    };
  }

  let bestAssignments: FMLineupAssignment[] = [];
  let maxTotal = -1;

  for (const hdPlayer of players) {
    const hdScore = getBestHDOnlyScore(hdPlayer.history);
    const hdPlay = getBestHDOnlyPlay(hdPlayer.history);

    for (const hrPlayer of players) {
      if (hrPlayer.id === hdPlayer.id) continue;

      const hrScore = getBestHRScore(hrPlayer.history);
      const hrPlay = getBestHRPlay(hrPlayer.history);

      const usedIds = new Set([hdPlayer.id, hrPlayer.id]);
      const optionalCount = Math.max(0, lineupSize - 2);
      const optionalCandidates = players
        .filter((p) => !usedIds.has(p.id))
        .map((p) => {
          const play = getBestFMOptionalPlay(p.history);
          return {
            player: p,
            role: "OPT" as const,
            score: play?.score ?? 0,
            displayMod: displayModFromPlay(play, "NM"),
          };
        })
        .filter((a) => a.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, optionalCount);

      const assignments: FMLineupAssignment[] = [
        {
          player: hdPlayer,
          role: "HD",
          score: hdScore,
          displayMod: displayModFromPlay(hdPlay, "HD"),
        },
        {
          player: hrPlayer,
          role: "HR",
          score: hrScore,
          displayMod: displayModFromPlay(hrPlay, "HR"),
        },
        ...optionalCandidates,
      ];

      const totalScore = assignments.reduce((sum, a) => sum + a.score, 0);
      if (totalScore > maxTotal) {
        maxTotal = totalScore;
        bestAssignments = assignments;
      }
    }
  }

  return {
    assignments: bestAssignments,
    totalScore: maxTotal > 0 ? maxTotal : 0,
    averageScore: maxTotal > 0 ? maxTotal / lineupSize : 0,
  };
}
