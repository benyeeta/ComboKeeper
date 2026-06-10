import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/session";
import { getCachedOsuUser } from "@/lib/osu";
import MyTournamentsList from "@/components/MyTournamentsList";
import TrophyCard from "@/components/TrophyCard";
import { getMyTournaments } from "@/lib/queries";
import { calculatePlayerTrophies } from "@/lib/trophies/playerTrophies";
import { getPersistedLifetimeTrophies, syncPlayerTrophies } from "@/lib/trophies/syncPlayerTrophies";
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
      scores: {
        include: {
          mappoolMap: {
            include: {
              stage: { include: { tournament: true } },
            },
          },
        },
      },
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
  const totalMatchScoresCount = matchScores.length;
  const matchSSCount = matchScores.filter(s => s.accuracy === 100).length;
  const matchFcCount = matchScores.filter(s => s.isFc).length;
  const matchMapIds = [...new Set(matchScores.map(s => s.mappoolMapId))];

  const activeTeams = player.teams.filter(t => t.status === "ACCEPTED");
  const activeTeamPlayerIds = [...new Set(activeTeams.flatMap(t => t.team.players.filter(tp => tp.status === "ACCEPTED").map(p => p.playerId)))];
  const playerMapIds = [...new Set(player.scores.map(s => s.mappoolMapId))];

  // 1. Fetch osu! API data and the max scores for MVP calculation in PARALLEL
  const [osuData, maxScoresData, teamScores, myTournaments] = await Promise.all([
    getCachedOsuUser(player.id),
    matchMapIds.length > 0 ? prisma.score.groupBy({
      by: ['mappoolMapId'],
      _max: { score: true },
      where: { mappoolMapId: { in: matchMapIds }, scoreType: "MATCH" }
    }) : Promise.resolve([]),
    playerMapIds.length > 0 ? prisma.score.findMany({
      where: { mappoolMapId: { in: playerMapIds }, playerId: { in: activeTeamPlayerIds } },
      select: { mappoolMapId: true, playerId: true, score: true, timestamp: true }
    }) : Promise.resolve([]),
    getMyTournaments(player.id),
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

  const rank = osuData?.statistics?.global_rank ? `#${osuData.statistics.global_rank.toLocaleString()}` : "Unranked";
  const pp = osuData?.statistics?.pp ? `${Math.round(osuData.statistics.pp).toLocaleString()} pp` : "";
  const countryCode = osuData?.country?.code || "";
  const countryFlagUrl = countryCode ? `https://osu.ppy.sh/images/flags/${countryCode}.png` : "";

  const trophyResult = calculatePlayerTrophies(
    player.scores,
    player.id,
    teamScores,
    matchSSCount,
    matchFcCount
  );

  try {
    await syncPlayerTrophies(player.id, trophyResult);
  } catch {
    // PlayerTrophy table may not exist until migration is applied
  }

  const persistedLifetime = await getPersistedLifetimeTrophies(player.id);
  const lifetimeKeys = new Set(trophyResult.lifetime.map((t) => t.key));
  const mergedLifetime = [...trophyResult.lifetime];

  for (const persisted of persistedLifetime) {
    if (!lifetimeKeys.has(persisted.trophyKey)) {
      const meta = persisted.metadata as { title?: string; description?: string } | null;
      mergedLifetime.push({
        key: persisted.trophyKey,
        title: meta?.title ?? persisted.trophyKey,
        description: meta?.description ?? "Previously earned lifetime accolade.",
        titleClassName: "text-gray-400",
      });
    }
  }

  const hasAnyTrophies =
    mergedLifetime.length > 0 || trophyResult.byTournament.some((g) => g.trophies.length > 0);

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
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Tournaments Participated</h2>
          <MyTournamentsList tournaments={myTournaments} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
          <h2 className="text-xl font-semibold mb-4">Player Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center shadow-sm">
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Scores</span>
              <span className="font-bold text-2xl text-gray-900 dark:text-white">{player.scores?.length || 0}</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center shadow-sm" title="Total scores logged during official matches">
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">Match Scores</span>
              <span className="font-bold text-2xl text-blue-500 dark:text-blue-400">{totalMatchScoresCount}</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center shadow-sm" title="Highest score on your team during official matches">
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">Match MVPs</span>
              <span className="font-bold text-2xl text-pink-400">{mvpCount}</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center shadow-sm">
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">Main Mod</span>
              <span className="font-bold text-2xl text-blue-400">{mainMod}</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center shadow-sm" title="Number of 100% accuracy scores in matches">
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">Match SS</span>
              <span className="font-bold text-2xl text-green-500 dark:text-green-400">{matchSSCount}</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center shadow-sm" title="Total Full Combos achieved during official matches">
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">Match FCs</span>
              <span className="font-bold text-2xl text-yellow-500 dark:text-yellow-400">{matchFcCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Personal Trophies</h2>

          {mergedLifetime.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Lifetime Accolades
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mergedLifetime.map((trophy) => (
                  <TrophyCard key={trophy.key} trophy={trophy} />
                ))}
              </div>
            </div>
          )}

          {trophyResult.byTournament.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Per-Tournament Performance
              </h3>
              {trophyResult.byTournament.map((group) => (
                <div key={group.tournamentId}>
                  <h4 className="text-base font-semibold text-pink-400 mb-3">{group.tournamentName}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.trophies.map((trophy) => (
                      <TrophyCard key={`${group.tournamentId}-${trophy.key}`} trophy={trophy} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!hasAnyTrophies && (
            <p className="text-sm text-gray-500">Play more maps and matches to earn personal trophies!</p>
          )}
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
