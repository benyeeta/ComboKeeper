import {
  displayModFromPlay,
  getBestPlayMatching,
  getBestScoreMatching,
  MMSlot,
  ModScoreHistory,
  scoreMatchesMMSlot,
} from "@/lib/modSlots";

export const MM_REQUIRED_MODS = ["HD", "HR", "NM"] as const;
export type MMRequiredMod = MMSlot;

export type MMScoreHistory = ModScoreHistory;

export type MMPlayer = {
  id: number;
  username?: string;
  avatarUrl?: string;
  history: MMScoreHistory[];
};

export type MMLineupAssignment = {
  player: MMPlayer;
  assignedMod: MMRequiredMod;
  score: number;
  displayMod: string;
};

export type MMLineupResult = {
  assignments: MMLineupAssignment[];
  totalScore: number;
  averageScore: number;
};

export function getBestMMScoreForSlot(history: MMScoreHistory[], slot: MMRequiredMod): number {
  return getBestScoreMatching(history, (mod) => scoreMatchesMMSlot(mod, slot));
}

function getBestMMPlayForSlot(history: MMScoreHistory[], slot: MMRequiredMod): MMScoreHistory | null {
  return getBestPlayMatching(history, (mod) => scoreMatchesMMSlot(mod, slot));
}

/** Assign players to HD / HR / NM slots to maximize total score. Only mod-matching scores count per slot. */
export function calculateBestMMLineup(players: MMPlayer[]): MMLineupResult {
  const playersToEvaluate: MMPlayer[] = [...players];
  let dummyIdCounter = -1;
  while (playersToEvaluate.length < MM_REQUIRED_MODS.length) {
    playersToEvaluate.push({ id: dummyIdCounter--, history: [] });
  }

  const playerBestScores = new Map<number, Record<MMRequiredMod, number>>();
  for (const p of playersToEvaluate) {
    playerBestScores.set(p.id, {
      HD: getBestMMScoreForSlot(p.history, "HD"),
      HR: getBestMMScoreForSlot(p.history, "HR"),
      NM: getBestMMScoreForSlot(p.history, "NM"),
    });
  }

  let bestAssignments: MMLineupAssignment[] = [];
  let maxTotal = -1;

  const findBestAssignment = (
    modIndex: number,
    current: MMLineupAssignment[],
    currentTotal: number,
    usedPlayers: Set<number>
  ) => {
    if (modIndex === MM_REQUIRED_MODS.length) {
      if (currentTotal > maxTotal) {
        maxTotal = currentTotal;
        bestAssignments = [...current];
      }
      return;
    }

    const slot = MM_REQUIRED_MODS[modIndex];
    for (const p of playersToEvaluate) {
      if (usedPlayers.has(p.id)) continue;

      const score = playerBestScores.get(p.id)![slot];
      const bestPlay = getBestMMPlayForSlot(p.history, slot);
      const displayMod = displayModFromPlay(bestPlay, slot);

      usedPlayers.add(p.id);
      current.push({ player: p, assignedMod: slot, score, displayMod });
      findBestAssignment(modIndex + 1, current, currentTotal + score, usedPlayers);
      current.pop();
      usedPlayers.delete(p.id);
    }
  };

  findBestAssignment(0, [], 0, new Set());

  const totalScore = bestAssignments.reduce((sum, a) => sum + a.score, 0);
  return {
    assignments: bestAssignments,
    totalScore,
    averageScore: totalScore / MM_REQUIRED_MODS.length,
  };
}
