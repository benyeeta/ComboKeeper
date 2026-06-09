import { parseTrackedPlayedMod } from "@/lib/osu";
import { MappoolMap } from "@/lib/types";

export type MatchPlayerInfo = {
  username: string;
  avatarUrl: string;
};

export type MapMvp = {
  userId: number;
  username: string;
  avatarUrl: string;
  score: number;
  mod: string;
  isFc: boolean;
};

export type MatchMapResult = {
  mapId: string;
  mapMod: string;
  ourScore: number;
  theirScore: number;
  won: boolean | null;
  mvp: MapMvp | null;
};

export type MatchHighlightSummary = {
  id: number;
  name: string;
  ourWins: number;
  theirWins: number;
  mapResults: MatchMapResult[];
  /** Player with the most map MVPs this match. */
  matchMvp: MapMvp & { topMapCount: number } | null;
  /** Single highest score on any map. */
  peakPlay: (MapMvp & { mapId: string }) | null;
};

export function buildMatchHighlightSummary(
  matchData: {
    match: { id: number; name: string };
    events: { game?: { beatmap_id: number; scores: any[] } }[];
    users?: { id: number; username: string; avatar_url?: string }[];
  },
  stageMaps: MappoolMap[],
  teamPlayerIds: Set<number>,
  resolvePlayer: (userId: number) => MatchPlayerInfo,
  isQualifier: boolean
): MatchHighlightSummary | null {
  const games = matchData.events
    .filter((e) => e.game?.beatmap_id)
    .map((e) => e.game!);

  const mapResults: MatchMapResult[] = [];

  for (const game of games) {
    const poolMap = stageMaps.find((m) => (m as MappoolMap & { beatmapId?: number }).beatmapId === game.beatmap_id);
    if (!poolMap) continue;

    let ourScore = 0;
    let theirScore = 0;
    let bestTeamScore: any = null;

    for (const s of game.scores) {
      if (s.score === 0) continue;
      if (teamPlayerIds.has(s.user_id)) {
        ourScore += s.score;
        if (!bestTeamScore || s.score > bestTeamScore.score) bestTeamScore = s;
      } else if (!isQualifier) {
        theirScore += s.score;
      }
    }

    let mvp: MapMvp | null = null;
    if (bestTeamScore) {
      const info = resolvePlayer(bestTeamScore.user_id);
      mvp = {
        userId: bestTeamScore.user_id,
        username: info.username,
        avatarUrl: info.avatarUrl,
        score: bestTeamScore.score,
        mod: parseTrackedPlayedMod(bestTeamScore.mods),
        isFc: !!bestTeamScore.perfect,
      };
    }

    mapResults.push({
      mapId: poolMap.id,
      mapMod: poolMap.mod,
      ourScore,
      theirScore,
      won: isQualifier ? null : ourScore > theirScore,
      mvp,
    });
  }

  if (mapResults.length === 0) return null;

  const mvpCounts = new Map<number, { count: number; mvp: MapMvp }>();
  let peakPlay: (MapMvp & { mapId: string }) | null = null;

  for (const result of mapResults) {
    if (!result.mvp) continue;
    const existing = mvpCounts.get(result.mvp.userId);
    if (existing) existing.count += 1;
    else mvpCounts.set(result.mvp.userId, { count: 1, mvp: result.mvp });

    if (!peakPlay || result.mvp.score > peakPlay.score) {
      peakPlay = { ...result.mvp, mapId: result.mapId };
    }
  }

  let matchMvp: (MapMvp & { topMapCount: number }) | null = null;
  for (const { count, mvp } of mvpCounts.values()) {
    if (!matchMvp || count > matchMvp.topMapCount) {
      matchMvp = { ...mvp, topMapCount: count };
    }
  }

  const ourWins = isQualifier ? 0 : mapResults.filter((r) => r.won).length;
  const theirWins = isQualifier ? 0 : mapResults.length - ourWins;

  return {
    id: matchData.match.id,
    name: matchData.match.name,
    ourWins,
    theirWins,
    mapResults,
    matchMvp,
    peakPlay,
  };
}

export function modBadgeClass(mod: string): string {
  if (mod === "DT") return "bg-blue-900/50 text-blue-300 border-blue-800";
  if (mod === "FM") return "bg-orange-900/50 text-orange-300 border-orange-800";
  if (mod === "MM") return "bg-purple-900/50 text-purple-300 border-purple-800";
  if (mod.includes("HD")) return "bg-yellow-900/50 text-yellow-300 border-yellow-800";
  if (mod === "NM") return "bg-gray-600 text-gray-100 border-gray-500";
  return "bg-red-900/50 text-red-300 border-red-800";
}

export function modBadgeLabel(mod: string): string {
  return mod === "NM" ? "NM" : `+${mod}`;
}
