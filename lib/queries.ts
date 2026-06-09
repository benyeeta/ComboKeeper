import prisma from '@/lib/prisma';
import { normalizePlayedMod } from '@/lib/parseMods';
import { MappoolMap, ScoreData } from '@/lib/types';

export async function getTournamentData(userId: number, selectedTournamentId?: string) {
  const isAdmin = process.env.ADMIN_OSU_ID ? userId === Number(process.env.ADMIN_OSU_ID) : false;

  const userFilter = isAdmin ? {} : { 
    OR: [
      { keepers: { some: { playerId: userId } } },
      { teams: { some: { team: { players: { some: { playerId: userId, status: "ACCEPTED" } } } } } }
    ]
  };

  // 1. Fetch the requested tournament, or default to the currently active one
  const whereClause = selectedTournamentId ? { id: selectedTournamentId, ...userFilter } : { isCompleted: false, ...userFilter };
  
  const [tournament, allTournaments] = await Promise.all([
    prisma.tournament.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        keepers: true,
        teams: {
          where: { team: { players: { some: { playerId: userId, status: "ACCEPTED" } } } },
          include: {
            team: {
              include: { players: { include: { player: true } } }
            } 
          }
        },
        stages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            maps: {
              include: {
                scores: {
                  include: { player: true },
                  orderBy: { timestamp: 'desc' }
                }
              }
            }
          }
        }
      }
    }),
    prisma.tournament.findMany({
      where: userFilter,
      select: { id: true, name: true, acronym: true, isCompleted: true, keepers: { select: { playerId: true } } },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const mappedAllTournaments = allTournaments.map(t => ({
    id: t.id,
    name: t.name,
    acronym: t.acronym,
    isCompleted: t.isCompleted,
    isKeeper: isAdmin || t.keepers.some(k => k.playerId === userId)
  }));

  if (!tournament) return { mappool: {}, allScores: [], activeTournament: null, stages: [], allTournaments: mappedAllTournaments };

  const isKeeper = isAdmin || tournament.keepers.some(k => k.playerId === userId);
  const userTeam = tournament.teams[0]?.team;

  const mappool: Record<string, MappoolMap[]> = {};
  const allScores: ScoreData[] = [];
  const stages = tournament.stages.map(s => ({ id: s.id, name: s.name }));

  // 2. Format the database rows into the structure our UI expects
  for (const stage of tournament.stages) {
    mappool[stage.name] = stage.maps.map(m => ({
      dbId: m.id,
      id: m.mapId,
      mod: m.mod as any,
      artist: m.artist,
      songName: m.songName,
      beatmapId: m.beatmapId,
      skill: m.skill || undefined,
    } as any)).sort((a, b) => {
      const modOrder = ['NM', 'HD', 'HR', 'DT', 'FM', 'MM', 'TB'];
      
      const rankA = modOrder.indexOf(a.mod) === -1 ? 99 : modOrder.indexOf(a.mod);
      const rankB = modOrder.indexOf(b.mod) === -1 ? 99 : modOrder.indexOf(b.mod);
      
      const modDiff = rankA - rankB;
      if (modDiff !== 0) return modDiff;
      
      const numA = parseInt(a.id.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.id.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });

    for (const map of stage.maps) {
      const playersMap = new Map<number, any>();
      
      for (const s of map.scores) {
        if (userTeam && !userTeam.players.some(p => p.playerId === s.playerId)) continue; // Only show my team's scores
        if (!playersMap.has(s.playerId)) {
          playersMap.set(s.playerId, {
            id: s.player.id,
            username: s.player.username,
            avatarUrl: s.player.avatarUrl || `https://a.ppy.sh/${s.player.id}`,
            history: []
          });
        }
        playersMap.get(s.playerId).history.push({
          id: s.id,
          score: s.score,
          accuracy: s.accuracy,
          scoreType: s.scoreType,
          playedMod: s.playedMod ? normalizePlayedMod(s.playedMod) : s.playedMod,
          timestamp: s.timestamp.toISOString()
        });
      }

      const players = Array.from(playersMap.values());
      if (players.length > 0) {
        allScores.push({
          mapId: map.mapId,
          stage: stage.name as any,
          artist: map.artist,
          songName: map.songName,
          players
        });
      }
    }
  }

  return { 
    mappool, 
    allScores,
    activeTournament: {
      id: tournament.id,
      name: tournament.name,
      acronym: tournament.acronym,
      format: tournament.format,
      rosterSize: tournament.rosterSize,
      isKeeper,
      teamId: userTeam?.id,
      teamName: userTeam?.name,
      isCompleted: tournament.isCompleted,
      placement: tournament.teams[0]?.placement,
      currentUserId: userId,
      currentUserRole: userTeam?.players.find(tp => tp.playerId === userId)?.role,
      players: userTeam?.players.map(tp => ({
        osuId: tp.player.id.toString(),
        username: tp.player.username,
        role: tp.role,
        isCaptain: tp.role === "CAPTAIN",
        isEditor: tp.role === "EDITOR",
        status: tp.status
      })) || []
    },
    stages,
    allTournaments: mappedAllTournaments
  };
}