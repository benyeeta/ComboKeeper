import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) redirect("/api/auth/login");
  
  const userSession = JSON.parse(sessionCookie);

  const player = await prisma.player.findUnique({
    where: { id: userSession.id },
    include: {
      scores: true,
      teams: { include: { team: { include: { tournaments: true } } } }
    }
  });

  if (!player) return <div className="p-8">Player not found in database.</div>;

  // Extract all the tournaments from the teams the player is on
  const tournaments = player.teams.flatMap(t => t.team.tournaments);

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 flex items-center gap-8 mb-8">
        <img src={player.avatarUrl || `https://a.ppy.sh/${player.id}`} alt={player.username} className="w-32 h-32 rounded-full border-4 border-gray-700" />
        <div>
          <h1 className="text-3xl font-bold mb-2">{player.username}</h1>
          <p className="text-gray-400">
            {player.isPublicProfile ? "Public Profile" : "Private Profile (Only visible to you)"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Tournaments Participated</h2>
          <ul className="space-y-3">
            {tournaments.length > 0 ? tournaments.map((t) => (
                <li key={t.id} className="bg-gray-900 p-3 rounded border border-gray-700">
                  <span className="font-medium text-pink-400">{t.name}</span>
                  <span className="text-sm text-gray-400 ml-2">({t.format})</span>
                </li>
              )) : <p className="text-sm text-gray-500">No tournaments found.</p>}
          </ul>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Funny Stats (TBD)</h2>
          <div className="space-y-4">
            <div className="bg-gray-900 p-4 rounded border border-gray-700 flex justify-between items-center">
              <span className="text-gray-400">Total Scores Added</span>
              <span className="font-bold text-white">{player.scores?.length || 0}</span>
            </div>
            {/* More fun stats can be added here later */}
          </div>
        </div>
      </div>
    </div>
  );
}