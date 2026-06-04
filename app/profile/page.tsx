import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/session";
import { getCachedOsuUser } from "@/lib/osu";
import LeaveTeamButton from "@/components/LeaveTeamButton";

export default async function ProfilePage() {
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
              tournaments: true,
              players: { include: { player: true } }
            } 
          } 
        } 
      }
    }
  });

  if (!player) return <div className="p-8">Player not found in database.</div>;

  // 1. Fetch osu! API data for Global Rank, PP, and Country
  const osuData = await getCachedOsuUser(player.id);

  // 2. Aggregate Stats
  const matchScores = player.scores.filter(s => s.scoreType === "MATCH");
  const matchMapIds = [...new Set(matchScores.map(s => s.mappoolMapId))];

  // Fetch all match scores from everyone on the maps this player played to calculate MVPs
  const allMatchScoresOnTheseMaps = await prisma.score.findMany({
    where: { mappoolMapId: { in: matchMapIds }, scoreType: "MATCH" }
  });

  let mvpCount = 0;
  for (const mapId of matchMapIds) {
    const scoresForMap = allMatchScoresOnTheseMaps.filter(s => s.mappoolMapId === mapId);
    const maxScore = Math.max(...scoresForMap.map(s => s.score));
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

  // Extract all the tournaments from the teams the player is on
  const activeTeams = player.teams.filter(t => t.status === "ACCEPTED");
  const tournamentsWithTeams = activeTeams.flatMap(t => 
    t.team.tournaments.map(tournament => ({
      ...tournament,
      teamId: t.team.id,
      teamName: t.team.name,
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
      </div>
    </div>
  );
}
