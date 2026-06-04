import prisma from '@/lib/prisma';
import { MappoolMap, ScoreData } from '@/lib/types';

export async function getTournamentData(userId: number, selectedTournamentId?: string) {
  const userFilter = { team: { players: { some: { playerId: userId } } } };

  // 1. Fetch the requested tournament, or default to the currently active one
  const whereClause = selectedTournamentId ? { id: selectedTournamentId, ...userFilter } : { isCompleted: false, ...userFilter };
  const tournament = await prisma.tournament.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      team: {
        include: {
          players: {
            include: { player: true }
          }
        }
      },
      stages: {
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
  });

  // Fetch all tournaments to populate the dashboard dropdown
  const allTournaments = await prisma.tournament.findMany({
    where: userFilter,
    select: { id: true, name: true, acronym: true, isCompleted: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!tournament) return { mappool: {}, allScores: [], activeTournament: null, stages: [], allTournaments };

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
          playedMod: s.playedMod,
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
      teamId: tournament.teamId,
      teamName: tournament.team.name,
      isCompleted: tournament.isCompleted,
      placement: tournament.placement,
      players: tournament.team.players.map(tp => ({
        osuId: tp.player.id.toString(),
        username: tp.player.username,
        isAdmin: tp.role === "CAPTAIN",
        status: tp.status
      }))
    },
    stages,
    allTournaments
  };
}