import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/session";
import { getCachedOsuUser } from "@/lib/osu";
import LeaveTeamButton from "@/components/LeaveTeamButton";
import { Suspense } from "react";

async function ProfileContent() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) redirect("/api/auth/login");
  
  const userSession = await decrypt(sessionCookie);
  if (!userSession) redirect("/api/auth/login");

  const player = await prisma.player.findUnique({
    where: { id: userSession.id },
    include: {
      scores: { include: { mappoolMap: true } },
      teams: { 
        include: { 
          team: { 
            include: { 
              tournaments: { include: { tournament: true } },
              players: { include: { player: true } }
            } 
          } 
        } 
      }
    }
  });

  if (!player) return <div className="p-8">Player not found in database.</div>;

  const matchScores = player.scores.filter(s => s.scoreType === "MATCH");
  const matchMapIds = [...new Set(matchScores.map(s => s.mappoolMapId))];

  // 1. Fetch osu! API data and the max scores for MVP calculation in PARALLEL
  const [osuData, maxScoresData] = await Promise.all([
    getCachedOsuUser(player.id),
    matchMapIds.length > 0 ? prisma.score.groupBy({
      by: ['mappoolMapId'],
      _max: { score: true },
      where: { mappoolMapId: { in: matchMapIds }, scoreType: "MATCH" }
    }) : Promise.resolve([])
  ]);

  // 2. Aggregate Stats
  const maxScoresMap = new Map(maxScoresData.map(s => [s.mappoolMapId, s._max?.score || 0]));

  let mvpCount = 0;
  for (const mapId of matchMapIds) {
    const maxScore = maxScoresMap.get(mapId) || 0;
    const playerMaxOnMap = Math.max(...matchScores.filter(s => s.mappoolMapId === mapId).map(s => s.score));
    // If this player holds the max match score on this map across the database, they are MVP!
    if (playerMaxOnMap === maxScore && maxScore > 0) mvpCount++;
  }

  const modCounts: Record<string, number> = {};
  player.scores.forEach(s => {
    const mod = s.playedMod && s.playedMod !== "NM" ? s.playedMod : (s.mappoolMap?.mod || "NM");
    modCounts[mod] = (modCounts[mod] || 0) + 1;
  });
  const mainMod = Object.entries(modCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

  const matchAccs = matchScores.map(s => s.accuracy).filter(a => a > 0);
  const avgMatchAcc = matchAccs.length > 0 ? (matchAccs.reduce((a, b) => a + b, 0) / matchAccs.length).toFixed(2) + "%" : "N/A";

  const rank = osuData?.statistics?.global_rank ? `#${osuData.statistics.global_rank.toLocaleString()}` : "Unranked";
  const pp = osuData?.statistics?.pp ? `${Math.round(osuData.statistics.pp).toLocaleString()} pp` : "";
  const countryCode = osuData?.country?.code || "";
  const countryFlagUrl = countryCode ? `https://osu.ppy.sh/images/flags/${countryCode}.png` : "";

  // Personal Trophies Calculation
  const skillAverages: Record<string, { total: number; count: number }> = {};
  player.scores.forEach(s => {
    if (s.mappoolMap?.skill) {
      if (!skillAverages[s.mappoolMap.skill]) skillAverages[s.mappoolMap.skill] = { total: 0, count: 0 };
      skillAverages[s.mappoolMap.skill].total += s.score;
      skillAverages[s.mappoolMap.skill].count += 1;
    }
  });
  let bestSkill = null;
  let bestSkillAvg = 0;
  for (const [skill, data] of Object.entries(skillAverages)) {
    const avg = data.total / data.count;
    if (avg > bestSkillAvg) { bestSkillAvg = avg; bestSkill = skill; }
  }

  const tbScores = player.scores.filter(s => s.mappoolMap?.mod === "TB" && s.scoreType === "MATCH");
  const tbAvg = tbScores.length > 0 ? tbScores.reduce((a, b) => a + b.score, 0) / tbScores.length : null;

  let sumBuffs = 0;
  let mapsWithBoth = 0;
  const mapScoresGrouped: Record<string, { practice: number[], match: number[] }> = {};
  
  player.scores.forEach(s => {
    if (!mapScoresGrouped[s.mappoolMapId]) mapScoresGrouped[s.mappoolMapId] = { practice: [], match: [] };
    if (s.scoreType === "MATCH") mapScoresGrouped[s.mappoolMapId].match.push(s.score);
    else if (!s.scoreType || s.scoreType === "PRACTICE") mapScoresGrouped[s.mappoolMapId].practice.push(s.score);
  });

  for (const data of Object.values(mapScoresGrouped)) {
    if (data.practice.length > 0 && data.match.length > 0) {
      const pAvg = data.practice.reduce((a, b) => a + b, 0) / data.practice.length;
      const mAvg = data.match.reduce((a, b) => a + b, 0) / data.match.length;
      sumBuffs += (mAvg - pAvg);
      mapsWithBoth++;
    }
  }

  const tournamentBuff = mapsWithBoth > 0 ? sumBuffs / mapsWithBoth : null;

  const mapScores: Record<string, number[]> = {};
  player.scores.forEach(s => {
    if (!mapScores[s.mappoolMapId]) mapScores[s.mappoolMapId] = [];
    mapScores[s.mappoolMapId].push(s.score);
  });
  let minVariance = Infinity;
  let metronomeMap = null;
  for (const [mapId, scores] of Object.entries(mapScores)) {
    if (scores.length >= 5) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev < minVariance) { minVariance = stdDev; metronomeMap = player.scores.find(s => s.mappoolMapId === mapId)?.mappoolMap; }
    }
  }

  const ssCount = player.scores.filter(s => s.accuracy === 100).length;

  // Extract all the tournaments from the teams the player is on
  const activeTeams = player.teams.filter(t => t.status === "ACCEPTED");
  const tournamentsWithTeams = activeTeams.flatMap(t => 
    t.team.tournaments.map(tt => ({
      ...tt.tournament,
      teamId: t.team.id,
      teamName: t.team.name,
      placement: tt.placement,
      roster: t.team.players.filter(tp => tp.status === "ACCEPTED").map(tp => ({
        username: tp.player.username,
        avatarUrl: tp.player.avatarUrl,
        id: tp.player.id,
        role: tp.role
      }))
    }))
  );

  return (
    <div className="max-w-4xl mx-auto mt-8 text-gray-900 dark:text-white">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 flex items-center gap-8 mb-8 shadow-sm transition-colors duration-200">
        <img src={player.avatarUrl || `https://a.ppy.sh/${player.id}`} alt={player.username} className="w-32 h-32 rounded-full border-4 border-gray-200 dark:border-gray-700" />
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            {player.username}
            {countryFlagUrl && <img src={countryFlagUrl} alt={countryCode} className="w-8 h-6 rounded-sm shadow-sm" title={countryCode} />}
          </h1>
          <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300 mb-2 font-medium">
            {rank !== "Unranked" && <span className="text-pink-400">{rank}</span>}
            {pp && <span>{pp}</span>}
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {player.isPublicProfile ? "Public Profile" : "Private Profile (Only visible to you)"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
          <h2 className="text-xl font-semibold mb-4">Tournaments Participated</h2>
          <ul className="space-y-3">
            {tournamentsWithTeams.length > 0 ? tournamentsWithTeams.map((t) => (
                <details key={t.id} className="bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 group transition-colors duration-200">
                  <summary className="p-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-pink-400">{t.name}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">({t.format})</span>
                      </div>
                      {t.placement && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Placement: <span className="font-semibold text-gray-900 dark:text-white">{t.placement}</span></p>}
                    </div>
                    <div className="flex items-center gap-4">
                      {t.isCompleted && <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded border border-green-800">Finished</span>}
                      <LeaveTeamButton teamId={t.teamId} />
                      <svg className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </summary>
                  <div className="p-3 pt-0 border-t border-gray-200 dark:border-gray-800 mt-2">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 mt-2 uppercase tracking-wider">{t.teamName} Roster</h4>
                    <div className="flex flex-wrap gap-2">
                      {t.roster.map(p => (
                        <div key={p.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-300 dark:border-gray-700 shadow-sm">
                          <img src={p.avatarUrl || `https://a.ppy.sh/${p.id}`} alt={p.username} className="w-5 h-5 rounded-full" />
                          <span className="text-sm text-gray-800 dark:text-gray-200">{p.username}</span>
                          {p.role === "CAPTAIN" && <span className="text-[10px] text-pink-400 font-bold" title="Captain">♔</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )) : <p className="text-sm text-gray-500">No tournaments found.</p>}
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
          <h2 className="text-xl font-semibold mb-4">Player Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center shadow-sm">
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Scores</span>
              <span className="font-bold text-2xl text-gray-900 dark:text-white">{player.scores?.length || 0}</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center shadow-sm" title="Highest score on your team during official matches">
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">Match MVPs</span>
              <span className="font-bold text-2xl text-pink-400">{mvpCount}</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center shadow-sm">
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">Main Mod</span>
              <span className="font-bold text-2xl text-blue-400">{mainMod}</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center shadow-sm">
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">Avg Match Acc</span>
              <span className="font-bold text-2xl text-green-500 dark:text-green-400">{avgMatchAcc}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Personal Trophies</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bestSkill && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-start shadow-sm">
                <span className="text-pink-500 font-bold mb-1">The {bestSkill} Demon</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Highest average score in {bestSkill} ({Math.round(bestSkillAvg).toLocaleString()}).</span>
              </div>
            )}
            {tbAvg !== null && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-start shadow-sm">
                <span className="text-blue-400 font-bold mb-1">Ice in the Veins</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Averages {Math.round(tbAvg).toLocaleString()} on Tiebreakers during matches.</span>
              </div>
            )}
            {tournamentBuff !== null && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-start shadow-sm">
                <span className={`font-bold mb-1 ${tournamentBuff > 0 ? 'text-green-500' : 'text-red-400'}`}>{tournamentBuff > 0 ? 'Tournament Buff' : 'Tournament Nerves'}</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Averages <span className="font-semibold">{tournamentBuff > 0 ? '+' : ''}{Math.round(tournamentBuff).toLocaleString()}</span> points {tournamentBuff > 0 ? 'higher' : 'lower'} in official matches vs practice.
            </span>
              </div>
            )}
            {metronomeMap && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-start shadow-sm">
                <span className="text-purple-400 font-bold mb-1">The Metronome</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Incredibly consistent on {metronomeMap.mapId} (±{Math.round(minVariance).toLocaleString()}).</span>
              </div>
            )}
            {ssCount > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-start shadow-sm">
                <span className="text-yellow-500 font-bold mb-1">The Purist / FC Machine</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Has achieved 100% accuracy {ssCount} time{ssCount > 1 ? 's' : ''}.</span>
              </div>
            )}
        {!bestSkill && tbAvg === null && tournamentBuff === null && !metronomeMap && ssCount === 0 && (
              <p className="text-sm text-gray-500 col-span-full">Play more maps and matches to earn personal trophies!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex flex-col items-center justify-center mt-24 text-gray-500">
        <div className="w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg font-medium">Loading Profile...</p>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
