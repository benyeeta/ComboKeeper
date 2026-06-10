export type ScoreWithMap = {
  id?: string;
  score: number;
  accuracy: number;
  timestamp?: Date | null;
  scoreType?: string | null;
  playedMod?: string | null;
  isFc?: boolean;
  mappoolMapId: string;
  mappoolMap?: {
    mapId?: string;
    mod?: string | null;
    skill?: string | null;
    stage?: {
      tournamentId?: string;
      tournament?: { id: string; name: string } | null;
    } | null;
  } | null;
};

export type TeamScoreRow = {
  mappoolMapId: string;
  playerId: number;
  score: number;
  timestamp: Date | null;
};

export type TrophyCard = {
  key: string;
  title: string;
  description: string;
  titleClassName: string;
};

export type TournamentTrophyGroup = {
  tournamentId: string;
  tournamentName: string;
  trophies: TrophyCard[];
};

export type PlayerTrophyResult = {
  lifetime: TrophyCard[];
  byTournament: TournamentTrophyGroup[];
  stickyLifetimeKeys: string[];
};

function isPracticeType(scoreType?: string | null): boolean {
  return !scoreType || scoreType === "PRACTICE" || scoreType === "LOBBY";
}

function getTournamentId(score: ScoreWithMap): string | null {
  return score.mappoolMap?.stage?.tournamentId ?? score.mappoolMap?.stage?.tournament?.id ?? null;
}

function getTournamentName(score: ScoreWithMap): string {
  return score.mappoolMap?.stage?.tournament?.name ?? "Tournament";
}

function groupScoresByTournament(scores: ScoreWithMap[]): Map<string, ScoreWithMap[]> {
  const map = new Map<string, ScoreWithMap[]>();
  for (const score of scores) {
    const tid = getTournamentId(score);
    if (!tid) continue;
    if (!map.has(tid)) map.set(tid, []);
    map.get(tid)!.push(score);
  }
  return map;
}

function computeLifetimeTrophies(
  scores: ScoreWithMap[],
  matchSSCount: number,
  matchFcCount: number
): { trophies: TrophyCard[]; stickyKeys: string[] } {
  const trophies: TrophyCard[] = [];
  const stickyKeys: string[] = [];

  let nightOwlCount = 0;
  let employedCount = 0;
  let totalTimeScores = 0;
  let practiceCount = 0;
  let matchCount = 0;

  scores.forEach((s) => {
    if (s.scoreType === "MATCH") matchCount++;
    else practiceCount++;

    if (s.timestamp) {
      const hour = new Date(s.timestamp).getHours();
      if (hour >= 0 && hour < 5) nightOwlCount++;
      if (hour >= 16 && hour < 23) employedCount++;
      totalTimeScores++;
    }
  });

  const everNightOwl = totalTimeScores >= 10 && nightOwlCount / totalTimeScores >= 0.7;
  const everEmployed = totalTimeScores >= 10 && employedCount / totalTimeScores >= 0.7;
  const isGhost = practiceCount >= 50 && practiceCount / (practiceCount + matchCount || 1) >= 0.9;

  if (everNightOwl) {
    stickyKeys.push("night_owl");
    trophies.push({
      key: "night_owl",
      title: "The Night Owl",
      description: "The moonlight powers their pen. Set 70%+ of their scores past midnight.",
      titleClassName: "text-indigo-400",
    });
  }

  if (everEmployed) {
    stickyKeys.push("employed");
    trophies.push({
      key: "employed",
      title: "The Employed",
      description: "Clocked out and logged in. Set 70%+ of their scores during prime after-work hours.",
      titleClassName: "text-amber-600",
    });
  }

  if (isGhost) {
    stickyKeys.push("ghost");
    trophies.push({
      key: "ghost",
      title: "The Ghost",
      description: "Grinds in absolute silence. 90%+ of scores logged in solo offline practice.",
      titleClassName: "text-gray-400",
    });
  }

  if (matchSSCount > 0) {
    stickyKeys.push("purist");
    trophies.push({
      key: "purist",
      title: "The Purist",
      description: `Has achieved 100% accuracy ${matchSSCount} time${matchSSCount > 1 ? "s" : ""} during matches.`,
      titleClassName: "text-yellow-500",
    });
  }

  if (matchFcCount > 0) {
    stickyKeys.push("fc_machine");
    trophies.push({
      key: "fc_machine",
      title: "FC Machine",
      description: `Has achieved a Full Combo ${matchFcCount} time${matchFcCount > 1 ? "s" : ""} during official matches.`,
      titleClassName: "text-orange-400",
    });
  }

  const mapScores: Record<string, number[]> = {};
  scores.forEach((s) => {
    if (!mapScores[s.mappoolMapId]) mapScores[s.mappoolMapId] = [];
    mapScores[s.mappoolMapId].push(s.score);
  });

  let maxPlays = 0;
  let clickerMapId: string | null = null;
  for (const [mapId, vals] of Object.entries(mapScores)) {
    if (vals.length > maxPlays) {
      maxPlays = vals.length;
      clickerMapId = scores.find((s) => s.mappoolMapId === mapId)?.mappoolMap?.mapId ?? mapId;
    }
  }

  if (maxPlays >= 45 && clickerMapId) {
    stickyKeys.push("clicker_trained");
    trophies.push({
      key: "clicker_trained",
      title: "Clicker Trained",
      description: `Responds perfectly to repetitive conditioning. Logged ${maxPlays} attempts on ${clickerMapId}.`,
      titleClassName: "text-orange-500",
    });
  }

  return { trophies, stickyKeys };
}

function computeTournamentTrophies(
  tournamentId: string,
  tournamentName: string,
  scores: ScoreWithMap[],
  playerId: number,
  teamScores: TeamScoreRow[]
): TournamentTrophyGroup | null {
  const trophies: TrophyCard[] = [];
  const tournamentMapIds = new Set(scores.map((s) => s.mappoolMapId));

  const skillAverages: Record<string, { total: number; count: number }> = {};
  scores.forEach((s) => {
    if (s.mappoolMap?.skill) {
      if (!skillAverages[s.mappoolMap.skill]) skillAverages[s.mappoolMap.skill] = { total: 0, count: 0 };
      skillAverages[s.mappoolMap.skill].total += s.score;
      skillAverages[s.mappoolMap.skill].count += 1;
    }
  });

  let bestSkill: string | null = null;
  let bestSkillAvg = 0;
  for (const [skill, data] of Object.entries(skillAverages)) {
    const avg = data.total / data.count;
    if (avg > bestSkillAvg) {
      bestSkillAvg = avg;
      bestSkill = skill;
    }
  }

  if (bestSkill) {
    trophies.push({
      key: "skill_demon",
      title: `The ${bestSkill} Demon`,
      description: `Highest average score in ${bestSkill} (${Math.round(bestSkillAvg).toLocaleString()}).`,
      titleClassName: "text-pink-500",
    });
  }

  const tbScores = scores.filter((s) => s.mappoolMap?.mod === "TB" && s.scoreType === "MATCH");
  if (tbScores.length > 0) {
    const tbAvg = tbScores.reduce((a, b) => a + b.score, 0) / tbScores.length;
    trophies.push({
      key: "ice_in_veins",
      title: "Ice in the Veins",
      description: `Averages ${Math.round(tbAvg).toLocaleString()} on Tiebreakers during matches.`,
      titleClassName: "text-blue-400",
    });
  }

  const mapScoresGrouped: Record<string, { practice: number[]; match: number[] }> = {};
  scores.forEach((s) => {
    if (!mapScoresGrouped[s.mappoolMapId]) mapScoresGrouped[s.mappoolMapId] = { practice: [], match: [] };
    if (s.scoreType === "MATCH") mapScoresGrouped[s.mappoolMapId].match.push(s.score);
    else if (isPracticeType(s.scoreType)) mapScoresGrouped[s.mappoolMapId].practice.push(s.score);
  });

  let sumBuffs = 0;
  let mapsWithBoth = 0;
  for (const data of Object.values(mapScoresGrouped)) {
    if (data.practice.length > 0 && data.match.length > 0) {
      const pAvg = data.practice.reduce((a, b) => a + b, 0) / data.practice.length;
      const mAvg = data.match.reduce((a, b) => a + b, 0) / data.match.length;
      sumBuffs += mAvg - pAvg;
      mapsWithBoth++;
    }
  }

  if (mapsWithBoth > 0) {
    const tournamentBuff = sumBuffs / mapsWithBoth;
    trophies.push({
      key: "tournament_buff",
      title: tournamentBuff > 0 ? "Tournament Buff" : "Tournament Nerves",
      description: `Averages ${tournamentBuff > 0 ? "+" : ""}${Math.round(tournamentBuff).toLocaleString()} points ${tournamentBuff > 0 ? "higher" : "lower"} in official matches vs practice.`,
      titleClassName: tournamentBuff > 0 ? "text-green-500" : "text-red-400",
    });
  }

  const mapScores: Record<string, number[]> = {};
  scores.forEach((s) => {
    if (!mapScores[s.mappoolMapId]) mapScores[s.mappoolMapId] = [];
    mapScores[s.mappoolMapId].push(s.score);
  });

  let minVariance = Infinity;
  let metronomeMapId: string | null = null;
  for (const [mapId, vals] of Object.entries(mapScores)) {
    if (vals.length >= 5) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / vals.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev < minVariance) {
        minVariance = stdDev;
        metronomeMapId = scores.find((s) => s.mappoolMapId === mapId)?.mappoolMap?.mapId ?? mapId;
      }
    }
  }

  if (metronomeMapId && minVariance < Infinity) {
    trophies.push({
      key: "metronome",
      title: "The Metronome",
      description: `Incredibly consistent on ${metronomeMapId} (±${Math.round(minVariance).toLocaleString()}).`,
      titleClassName: "text-purple-400",
    });
  }

  const tournamentTeamScores = teamScores.filter((ts) => tournamentMapIds.has(ts.mappoolMapId));
  const teamScoresByMap = new Map<string, TeamScoreRow[]>();
  tournamentTeamScores.forEach((ts) => {
    if (!teamScoresByMap.has(ts.mappoolMapId)) teamScoresByMap.set(ts.mappoolMapId, []);
    teamScoresByMap.get(ts.mappoolMapId)!.push(ts);
  });

  let supportCount = 0;
  let carryCount = 0;
  let scouterCount = 0;
  let lowestAvgMap = { id: "", avg: Infinity };

  for (const [mapId, mapTeamScores] of teamScoresByMap.entries()) {
    const validScores = mapTeamScores.filter((s) => s.timestamp);
    if (validScores.length > 0) {
      const earliest = validScores.reduce((min, s) => (s.timestamp! < min.timestamp! ? s : min), validScores[0]);
      if (earliest.playerId === playerId) scouterCount++;
    }

    const playerMaxes = new Map<number, number>();
    mapTeamScores.forEach((s) => {
      const current = playerMaxes.get(s.playerId) || 0;
      if (s.score > current) playerMaxes.set(s.playerId, s.score);
    });

    const sorted = Array.from(playerMaxes.entries()).sort((a, b) => b[1] - a[1]);
    const rankIndex = sorted.findIndex((p) => p[0] === playerId);
    if (rankIndex === 0) carryCount++;
    else if (rankIndex === 1 || rankIndex === 2) supportCount++;

    if (sorted.length > 1) {
      const avg = sorted.reduce((sum, p) => sum + p[1], 0) / sorted.length;
      if (avg < lowestAvgMap.avg) lowestAvgMap = { id: mapId, avg };
    }
  }

  if (supportCount >= 5 && supportCount > carryCount) {
    trophies.push({
      key: "support_main",
      title: "The Support Main",
      description: "The backbone of the lobby. Consistently holding the line with top 3 finishes.",
      titleClassName: "text-emerald-500",
    });
  }

  if (scouterCount >= 5) {
    trophies.push({
      key: "scouter",
      title: "The Scouter",
      description: `First on the frontline. Scouting the pool before anyone else on ${scouterCount} maps.`,
      titleClassName: "text-lime-500",
    });
  }

  if (lowestAvgMap.avg < Infinity) {
    const lowestScores = teamScoresByMap.get(lowestAvgMap.id) || [];
    const maxOnLowest = lowestScores.reduce(
      (max, s) => (s.score > max.score ? s : max),
      { score: -1, playerId: -1, timestamp: null, mappoolMapId: lowestAvgMap.id }
    );
    if (maxOnLowest.playerId === playerId) {
      const anchorMapId = scores.find((s) => s.mappoolMapId === lowestAvgMap.id)?.mappoolMap?.mapId ?? "worst map";
      trophies.push({
        key: "captains_anchor",
        title: "Captain's Anchor",
        description: `Hard-carrying the team's worst map (${anchorMapId}).`,
        titleClassName: "text-cyan-500",
      });
    }
  }

  const matchScores = scores.filter((s) => s.scoreType === "MATCH");
  const matchScoresByDay = new Map<string, Set<string>>();
  matchScores.forEach((s) => {
    if (s.timestamp) {
      const day = new Date(s.timestamp).toISOString().split("T")[0];
      if (!matchScoresByDay.has(day)) matchScoresByDay.set(day, new Set());
      matchScoresByDay.get(day)!.add(s.mappoolMapId);
    }
  });

  for (const maps of matchScoresByDay.values()) {
    if (maps.size >= 8) {
      trophies.push({
        key: "slave",
        title: "The Slave",
        description: `Played a grueling ${maps.size} maps in a single match session.`,
        titleClassName: "text-red-500",
      });
      break;
    }
  }

  if (trophies.length === 0) return null;

  return { tournamentId, tournamentName, trophies };
}

export function calculatePlayerTrophies(
  scores: ScoreWithMap[],
  playerId: number,
  teamScores: TeamScoreRow[],
  matchSSCount: number,
  matchFcCount: number
): PlayerTrophyResult {
  const { trophies: lifetime, stickyKeys } = computeLifetimeTrophies(scores, matchSSCount, matchFcCount);

  const byTournamentId = groupScoresByTournament(scores);
  const byTournament: TournamentTrophyGroup[] = [];

  for (const [tournamentId, tournamentScores] of byTournamentId.entries()) {
    const name = getTournamentName(tournamentScores[0]);
    const group = computeTournamentTrophies(tournamentId, name, tournamentScores, playerId, teamScores);
    if (group) byTournament.push(group);
  }

  byTournament.sort((a, b) => a.tournamentName.localeCompare(b.tournamentName));

  return {
    lifetime,
    byTournament,
    stickyLifetimeKeys: stickyKeys,
  };
}
