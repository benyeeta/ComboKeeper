import { ScoreData } from "@/lib/types";

export const REQUIRED_RUNS_PER_MAP = 2;

export type RosterPlayer = {
  id: number;
  username: string;
  avatarUrl?: string;
};

export type SlackMapGap = {
  mapId: string;
  playCount: number;
};

export type TeamSlacker = RosterPlayer & {
  missingMaps: SlackMapGap[];
};

export type TeamPracticeCoverage = {
  requiredMapIds: string[];
  slackers: TeamSlacker[];
  /** True when every roster player has at least two runs on every required map. */
  fullCompletion: boolean;
};

function isTiebreakerMap(mapId: string): boolean {
  return mapId.toUpperCase().includes("TB");
}

/** Map ids that count toward the two-runs-per-map goal (stage pool minus tiebreaker). */
export function getRequiredPracticeMapIds(
  mappool: Record<string, { id: string }[]> | undefined,
  selectedStage: string,
  stageScores: ScoreData[]
): string[] {
  const fromPool = (mappool?.[selectedStage] ?? [])
    .map((m) => m.id)
    .filter((id) => !isTiebreakerMap(id));

  if (fromPool.length > 0) return fromPool;

  return [...new Set(stageScores.map((s) => s.mapId))].filter((id) => !isTiebreakerMap(id));
}

export function calculateTeamPracticeCoverage(
  stageScores: ScoreData[],
  requiredMapIds: string[],
  rosterPlayers: RosterPlayer[],
  runsRequired = REQUIRED_RUNS_PER_MAP
): TeamPracticeCoverage | null {
  if (requiredMapIds.length === 0 || rosterPlayers.length === 0) return null;

  const playCounts = new Map<number, Map<string, number>>();

  for (const mapData of stageScores) {
    for (const player of mapData.players) {
      if (!playCounts.has(player.id)) playCounts.set(player.id, new Map());
      const mapCounts = playCounts.get(player.id)!;
      mapCounts.set(mapData.mapId, player.history.length);
    }
  }

  const slackers: TeamSlacker[] = [];

  for (const roster of rosterPlayers) {
    const mapCounts = playCounts.get(roster.id) ?? new Map<string, number>();
    const missingMaps: SlackMapGap[] = [];

    for (const mapId of requiredMapIds) {
      const playCount = mapCounts.get(mapId) ?? 0;
      if (playCount < runsRequired) {
        missingMaps.push({ mapId, playCount });
      }
    }

    if (missingMaps.length > 0) {
      missingMaps.sort((a, b) => a.playCount - b.playCount || a.mapId.localeCompare(b.mapId));
      slackers.push({
        ...roster,
        missingMaps,
      });
    }
  }

  slackers.sort(
    (a, b) =>
      b.missingMaps.length - a.missingMaps.length ||
      a.username.localeCompare(b.username)
  );

  return {
    requiredMapIds,
    slackers,
    fullCompletion: slackers.length === 0,
  };
}

export type PracticeCoverageProgress = {
  completedRuns: number;
  totalRequiredRuns: number;
  percent: number;
};

export function calculatePracticeCoverageProgress(
  stageScores: ScoreData[],
  requiredMapIds: string[],
  rosterPlayers: RosterPlayer[],
  runsRequired = REQUIRED_RUNS_PER_MAP
): PracticeCoverageProgress {
  const totalRequiredRuns = requiredMapIds.length * rosterPlayers.length * runsRequired;
  if (totalRequiredRuns === 0) {
    return { completedRuns: 0, totalRequiredRuns: 0, percent: 0 };
  }

  const playCounts = new Map<number, Map<string, number>>();
  for (const mapData of stageScores) {
    for (const player of mapData.players) {
      if (!playCounts.has(player.id)) playCounts.set(player.id, new Map());
      playCounts.get(player.id)!.set(mapData.mapId, player.history.length);
    }
  }

  let completedRuns = 0;
  for (const roster of rosterPlayers) {
    const mapCounts = playCounts.get(roster.id) ?? new Map<string, number>();
    for (const mapId of requiredMapIds) {
      completedRuns += Math.min(mapCounts.get(mapId) ?? 0, runsRequired);
    }
  }

  return {
    completedRuns,
    totalRequiredRuns,
    percent: Math.round((completedRuns / totalRequiredRuns) * 100),
  };
}
