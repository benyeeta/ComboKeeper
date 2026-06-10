import { calculateMapIntelStats } from "@/lib/mapLineup";
import { MappoolMap, ScoreData } from "@/lib/types";
import { REQUIRED_RUNS_PER_MAP } from "@/lib/teamPracticeCoverage";
import { parseLineupSize } from "@/lib/tournamentFormat";
import type { MMPlayer } from "@/lib/mmLineup";

export type MapPracticePriority = {
  id: string;
  avg: number;
  plays: number;
  coverageGap: number;
  underPracticedPlayers: { username: string; playCount: number }[];
};

function isPracticeScoreType(scoreType?: string): boolean {
  return !scoreType || scoreType === "PRACTICE" || scoreType === "LOBBY";
}

function filterPracticeHistory(players: MMPlayer[]): MMPlayer[] {
  return players.map((player) => ({
    ...player,
    history: player.history.filter((h) => isPracticeScoreType(h.scoreType)),
  }));
}

function isTiebreakerMap(mapId: string): boolean {
  return mapId.toUpperCase().includes("TB");
}

function sortPriority(a: MapPracticePriority, b: MapPracticePriority): number {
  if (a.plays === 0 && b.plays > 0) return -1;
  if (b.plays === 0 && a.plays > 0) return 1;
  if (a.coverageGap !== b.coverageGap) return b.coverageGap - a.coverageGap;
  if (a.avg === 0 && b.avg > 0) return -1;
  if (b.avg === 0 && a.avg > 0) return 1;
  return a.avg - b.avg;
}

export type MapsToPracticeInput = {
  mappool: Record<string, MappoolMap[]> | undefined;
  selectedStage: string;
  stageScores: ScoreData[];
  rosterPlayerIds: number[];
  rosterUsernames: Map<number, string>;
  lineupSize: number;
  excludeMapIds: string[];
};

export function calculateMapsToPractice({
  mappool,
  selectedStage,
  stageScores,
  rosterPlayerIds,
  rosterUsernames,
  lineupSize,
  excludeMapIds,
}: MapsToPracticeInput): MapPracticePriority[] {
  const stageMaps = mappool?.[selectedStage] ?? [];
  const mapIdsFromPool = stageMaps.map((m) => m.id).filter((id) => !isTiebreakerMap(id));
  const mapIds =
    mapIdsFromPool.length > 0
      ? mapIdsFromPool
      : [...new Set(stageScores.map((s) => s.mapId))].filter((id) => !isTiebreakerMap(id));

  const excludeSet = new Set(excludeMapIds.map((id) => id.toUpperCase()));
  const mapStats: MapPracticePriority[] = [];

  for (const mapId of mapIds) {
    if (excludeSet.has(mapId.toUpperCase())) continue;

    const mapMeta = stageMaps.find((m) => m.id === mapId);
    const mapMod = mapMeta?.mod ?? (mapId.replace(/\d+$/, "").toUpperCase() || "NM");

    const scoreEntry = stageScores.find((s) => s.mapId === mapId);
    const rawPlayers = scoreEntry?.players ?? [];
    const practicePlayers = filterPracticeHistory(rawPlayers);

    const intel = calculateMapIntelStats(practicePlayers, mapMod, lineupSize);
    const plays = practicePlayers.reduce((sum, p) => sum + p.history.length, 0);

    const underPracticedPlayers: { username: string; playCount: number }[] = [];
    let coverageGap = 0;

    for (const playerId of rosterPlayerIds) {
      const player = rawPlayers.find((p) => p.id === playerId);
      const playCount = player?.history.length ?? 0;
      if (playCount < REQUIRED_RUNS_PER_MAP) {
        coverageGap += REQUIRED_RUNS_PER_MAP - playCount;
        underPracticedPlayers.push({
          username: rosterUsernames.get(playerId) ?? `Player ${playerId}`,
          playCount,
        });
      }
    }

    underPracticedPlayers.sort((a, b) => a.playCount - b.playCount);

    mapStats.push({
      id: mapId,
      avg: intel.avg,
      plays,
      coverageGap,
      underPracticedPlayers,
    });
  }

  return mapStats.sort(sortPriority).slice(0, 3);
}

export function buildMapsToPracticeInputFromIntel(
  mappool: Record<string, MappoolMap[]> | undefined,
  selectedStage: string,
  stageScores: ScoreData[],
  activeTournament: { format?: string; players?: { osuId: string; username: string; status: string }[] } | undefined,
  hiddenPlayerIds: Set<number>,
  excludeMapIds: string[]
): MapsToPracticeInput {
  const rosterPlayers = (activeTournament?.players ?? [])
    .filter((p) => p.status === "ACCEPTED")
    .map((p) => ({
      id: parseInt(p.osuId, 10),
      username: p.username,
    }))
    .filter((p) => !hiddenPlayerIds.has(p.id));

  return {
    mappool,
    selectedStage,
    stageScores,
    rosterPlayerIds: rosterPlayers.map((p) => p.id),
    rosterUsernames: new Map(rosterPlayers.map((p) => [p.id, p.username])),
    lineupSize: parseLineupSize(activeTournament?.format),
    excludeMapIds,
  };
}
