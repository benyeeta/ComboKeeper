import { normalizePlayedMod } from "@/lib/parseMods";
import { MappoolMap, ScoreData } from "@/lib/types";

const MOD_ORDER = ["NM", "HD", "HR", "DT", "FM", "MM", "TB"] as const;

export function sortMappoolMaps<T extends { mod: string; id: string }>(maps: T[]): T[] {
  return [...maps].sort((a, b) => {
    const rankA = MOD_ORDER.indexOf(a.mod as (typeof MOD_ORDER)[number]) === -1 ? 99 : MOD_ORDER.indexOf(a.mod as (typeof MOD_ORDER)[number]);
    const rankB = MOD_ORDER.indexOf(b.mod as (typeof MOD_ORDER)[number]) === -1 ? 99 : MOD_ORDER.indexOf(b.mod as (typeof MOD_ORDER)[number]);
    const modDiff = rankA - rankB;
    if (modDiff !== 0) return modDiff;
    const numA = parseInt(a.id.replace(/\D/g, "") || "0", 10);
    const numB = parseInt(b.id.replace(/\D/g, "") || "0", 10);
    return numA - numB;
  });
}

type MapWithScores = {
  mapId: string;
  artist: string;
  songName: string;
  scores: Array<{
    id: string;
    playerId: number;
    score: number;
    accuracy: number;
    scoreType: string;
    playedMod: string | null;
    timestamp: Date;
    player: { id: number; username: string; avatarUrl: string | null };
  }>;
};

export function formatStageScores(
  stageName: string,
  maps: MapWithScores[],
  teamPlayerIds: Set<number> | null,
): ScoreData[] {
  const allScores: ScoreData[] = [];

  for (const map of maps) {
    const playersMap = new Map<
      number,
      { id: number; username: string; avatarUrl: string; history: ScoreData["players"][0]["history"] }
    >();

    for (const s of map.scores) {
      if (teamPlayerIds && !teamPlayerIds.has(s.playerId)) continue;
      if (!playersMap.has(s.playerId)) {
        playersMap.set(s.playerId, {
          id: s.player.id,
          username: s.player.username,
          avatarUrl: s.player.avatarUrl || `https://a.ppy.sh/${s.player.id}`,
          history: [],
        });
      }
      playersMap.get(s.playerId)!.history.push({
        id: s.id,
        score: s.score,
        accuracy: s.accuracy,
        scoreType: s.scoreType,
        playedMod: s.playedMod ? normalizePlayedMod(s.playedMod) : s.playedMod,
        timestamp: s.timestamp.toISOString(),
      });
    }

    const players = Array.from(playersMap.values());
    if (players.length > 0) {
      allScores.push({
        mapId: map.mapId,
        stage: stageName,
        artist: map.artist,
        songName: map.songName,
        players,
      });
    }
  }

  return allScores;
}

export function buildMappoolEntry(m: {
  id: string;
  mapId: string;
  mod: string;
  artist: string;
  songName: string;
  beatmapId: number | null;
  beatmapsetId: number | null;
  skill: string | null;
}): MappoolMap {
  return {
    dbId: m.id,
    id: m.mapId,
    mod: m.mod as MappoolMap["mod"],
    artist: m.artist,
    songName: m.songName,
    beatmapId: m.beatmapId,
    beatmapsetId: m.beatmapsetId,
    skill: m.skill || undefined,
  } as MappoolMap;
}
