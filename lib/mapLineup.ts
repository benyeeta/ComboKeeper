import { MappoolMap } from "@/lib/types";
import { calculateBestFMLineup } from "@/lib/fmLineup";
import { calculateActualMMLineup, calculateBestMMLineup, MMPlayer } from "@/lib/mmLineup";
import {
  isHDOnlyPlay,
  isHRPlay,
  isNomodPlay,
  isValidFMPlay,
} from "@/lib/modSlots";

export function getMapModFromPool(
  mappool: Record<string, MappoolMap[]> | undefined,
  stage: string,
  mapId: string
): string {
  const map = mappool?.[stage]?.find((m) => m.id === mapId);
  if (map?.mod) return map.mod;
  const prefix = mapId.replace(/\d+$/, "").toUpperCase();
  return prefix || "NM";
}

export type MapPickStats = {
  avg: number;
  topScores: number[];
};

export type MapIntelStats = MapPickStats & {
  /** Sorted lineup slot scores (best first) used for fortress / hive mind. */
  lineupScores: number[];
  /** Std dev of mod-relevant practice scores on this map (safe / coinflip picks). */
  playStdDev: number;
  /** Players that contribute to the lineup (3 for MM regardless of format). */
  effectiveLineupSize: number;
};

function averageTopScores(scores: number[], lineupSize: number): MapPickStats {
  const topScores = scores.filter((s) => s > 0).sort((a, b) => b - a).slice(0, lineupSize);
  const avg =
    lineupSize > 0 && topScores.length > 0
      ? topScores.reduce((sum, s) => sum + s, 0) / lineupSize
      : 0;
  return { avg, topScores };
}

function scoreStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/** Scores that count toward variance on mod-specific brackets. */
function collectModRelevantScores(players: MMPlayer[], mapMod: string): number[] {
  const scores: number[] = [];
  for (const player of players) {
    for (const play of player.history) {
      if (mapMod === "MM") {
        if (isNomodPlay(play.playedMod) || isHDOnlyPlay(play.playedMod) || isHRPlay(play.playedMod)) {
          scores.push(play.score);
        }
      } else if (mapMod === "FM") {
        if (isValidFMPlay(play.playedMod)) scores.push(play.score);
      } else {
        scores.push(play.score);
      }
    }
  }
  return scores;
}

export function effectiveLineupSizeForMod(mapMod: string, lineupSize: number): number {
  return mapMod === "MM" ? 3 : lineupSize;
}

/** Unified map intel: pick-order avg, lineup scores, and mod-aware variance. */
export function calculateMapIntelStats(
  players: MMPlayer[],
  mapMod: string,
  lineupSize: number
): MapIntelStats {
  const effectiveLineupSize = effectiveLineupSizeForMod(mapMod, lineupSize);
  const modRelevantScores = collectModRelevantScores(players, mapMod);
  const playStdDev = modRelevantScores.length >= 3 ? scoreStdDev(modRelevantScores) : 0;

  if (players.length === 0) {
    return { avg: 0, topScores: [], lineupScores: [], playStdDev: 0, effectiveLineupSize };
  }

  if (mapMod === "MM") {
    const lineup = calculateBestMMLineup(players);
    const lineupScores = [...lineup.assignments.map((a) => a.score)].sort((a, b) => b - a);
    return {
      avg: lineup.averageScore,
      topScores: lineupScores.filter((s) => s > 0),
      lineupScores,
      playStdDev,
      effectiveLineupSize,
    };
  }

  if (mapMod === "FM") {
    const lineup = calculateBestFMLineup(players, lineupSize);
    const lineupScores = [...lineup.assignments.map((a) => a.score)].sort((a, b) => b - a);
    return {
      avg: lineup.averageScore,
      topScores: lineupScores.filter((s) => s > 0),
      lineupScores,
      playStdDev,
      effectiveLineupSize,
    };
  }

  const pickStats = (() => {
    const perPlayerBest = players.map((p) =>
      p.history.length > 0 ? Math.max(...p.history.map((h) => h.score)) : 0
    );
    return averageTopScores(perPlayerBest, lineupSize);
  })();

  return {
    ...pickStats,
    lineupScores: [...pickStats.topScores],
    playStdDev,
    effectiveLineupSize,
  };
}

/** Compute pick-order average and lineup scores for a map based on its mod and match format. */
export function calculateMapPickStats(
  players: MMPlayer[],
  mapMod: string,
  lineupSize: number
): MapPickStats {
  const { avg, topScores } = calculateMapIntelStats(players, mapMod, lineupSize);
  return { avg, topScores };
}

export type LineupDisplayPlayer = MMPlayer & {
  assignedMod?: string;
  _score?: number;
};

export type MapLineupDisplayResult = {
  players: LineupDisplayPlayer[];
  mmWarning?: string;
};

/** Build the display lineup shown beside each map in the feed. */
export function calculateMapLineupDisplay(
  players: MMPlayer[],
  mapMod: string,
  lineupSize: number
): MapLineupDisplayResult {
  if (players.length === 0) return { players: [] };

  if (mapMod === "MM") {
    const actual = calculateActualMMLineup(players);
    if (actual.plays.length === 0) return { players: [] };
    return {
      players: actual.plays.map((play) => ({
        ...play.player,
        username: play.player.username ?? "",
        avatarUrl: play.player.avatarUrl ?? "",
        assignedMod: play.playedMod,
        _score: play.score,
      })),
      mmWarning: actual.isValidMMDistribution ? undefined : actual.invalidReason,
    };
  }

  if (mapMod === "FM") {
    const lineup = calculateBestFMLineup(players, lineupSize);
    if (lineup.totalScore <= 0) return { players: [] };
    return {
      players: lineup.assignments
        .filter((a) => a.player.id >= 0)
        .map((a) => ({
          ...a.player,
          username: a.player.username ?? "",
          avatarUrl: a.player.avatarUrl ?? "",
          assignedMod: a.displayMod,
          _score: a.score,
        }))
        .sort((a, b) => (b._score || 0) - (a._score || 0)),
    };
  }

  return {
    players: players
      .map((p) => {
        const bestPlay =
          p.history.length > 0
            ? p.history.reduce((a, b) => (a.score > b.score ? a : b))
            : { score: 0, playedMod: "NM" };
        return {
          ...p,
          username: p.username ?? "",
          avatarUrl: p.avatarUrl ?? "",
          _score: bestPlay.score,
          assignedMod: bestPlay.playedMod || "NM",
        };
      })
      .filter((p) => (p._score || 0) > 0)
      .sort((a, b) => (b._score || 0) - (a._score || 0))
      .slice(0, lineupSize),
  };
}
