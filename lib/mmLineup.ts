import {
  displayModFromPlay,
  getBestPlayMatching,
  getBestScoreMatching,
  isHDOnlyPlay,
  isHRPlay,
  isNomodPlay,
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

export type ActualMMPlay = {
  player: MMPlayer;
  score: number;
  playedMod: string;
};

export type ActualMMLineupResult = {
  plays: ActualMMPlay[];
  isValidMMDistribution: boolean;
  invalidReason?: string;
};

const SCORE_TYPE_PRIORITY: Record<string, number> = {
  MATCH: 0,
  LOBBY: 1,
  PRACTICE: 2,
};

function scoreTypeRank(scoreType?: string): number {
  if (!scoreType || scoreType === "PRACTICE") return SCORE_TYPE_PRIORITY.PRACTICE;
  if (scoreType === "LOBBY") return SCORE_TYPE_PRIORITY.LOBBY;
  if (scoreType in SCORE_TYPE_PRIORITY) return SCORE_TYPE_PRIORITY[scoreType];
  if (scoreType.startsWith("QUALIFIER")) return 3;
  return 4;
}

export function pickRepresentativePlay(history: MMScoreHistory[]): MMScoreHistory | null {
  if (history.length === 0) return null;

  const sorted = [...history].sort((a, b) => {
    const typeDiff = scoreTypeRank(a.scoreType) - scoreTypeRank(b.scoreType);
    if (typeDiff !== 0) return typeDiff;
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    return b.score - a.score;
  });

  const preferredType = sorted[0].scoreType;
  const sameType = sorted.filter((h) => h.scoreType === preferredType || (!h.scoreType && preferredType === "PRACTICE"));
  return sameType.reduce((best, current) => (current.score > best.score ? current : best), sameType[0]);
}

export function validateMMDistribution(plays: { playedMod?: string | null }[]): {
  isValid: boolean;
  reason?: string;
} {
  if (plays.length === 0) return { isValid: true };

  let nm = 0;
  let hd = 0;
  let hr = 0;

  for (const play of plays) {
    if (isNomodPlay(play.playedMod)) nm++;
    else if (isHDOnlyPlay(play.playedMod)) hd++;
    else if (isHRPlay(play.playedMod)) hr++;
  }

  if (plays.length >= 2 && nm === plays.length) {
    return { isValid: false, reason: "Invalid MM — all NoMod" };
  }

  if (plays.length === 3 && !(nm === 1 && hd === 1 && hr === 1)) {
    return { isValid: false, reason: "Invalid MM — missing required mod distribution" };
  }

  return { isValid: true };
}

/** Show each player's actual played mod (prefer match, then lobby, then practice). */
export function calculateActualMMLineup(players: MMPlayer[]): ActualMMLineupResult {
  const plays: ActualMMPlay[] = [];

  for (const player of players) {
    const representative = pickRepresentativePlay(player.history);
    if (!representative || representative.score <= 0) continue;

    plays.push({
      player,
      score: representative.score,
      playedMod: representative.playedMod && representative.playedMod !== "NM" ? representative.playedMod : "NM",
    });
  }

  plays.sort((a, b) => b.score - a.score);
  const topPlays = plays.slice(0, MM_REQUIRED_MODS.length);
  const validation = validateMMDistribution(topPlays);

  return {
    plays: topPlays,
    isValidMMDistribution: validation.isValid,
    invalidReason: validation.reason,
  };
}

export function hasPlayedModData(players: MMPlayer[]): boolean {
  return players.some((p) =>
    p.history.some((h) => h.playedMod != null && h.playedMod !== "")
  );
}
