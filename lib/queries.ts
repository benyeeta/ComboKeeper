import { cacheLife, cacheTag } from "next/cache";
import prisma from '@/lib/prisma';
import { MappoolMap } from '@/lib/types';
import type { MyTournamentCard } from '@/lib/tournamentLists';
import { buildMappoolEntry, formatStageScores, sortMappoolMaps } from '@/lib/stageScores';

export type TournamentDataResult = Awaited<ReturnType<typeof fetchTournamentDataFromDb>>;

export type TournamentInitialData = TournamentDataResult & {
  currentUser?: { id: number; username: string };
};

export async function getMyTournaments(userId: number): Promise<MyTournamentCard[]> {
  const memberships = await prisma.teamPlayer.findMany({
    where: { playerId: userId, status: 'ACCEPTED' },
    include: {
      team: {
        include: {
          tournaments: { include: { tournament: true } },
          players: {
            where: { status: 'ACCEPTED' },
            include: { player: true },
          },
        },
      },
    },
  });

  const entries: MyTournamentCard[] = [];

  for (const membership of memberships) {
    for (const tt of membership.team.tournaments) {
      entries.push({
        id: tt.tournament.id,
        name: tt.tournament.name,
        acronym: tt.tournament.acronym,
        format: tt.tournament.format,
        isCompleted: tt.tournament.isCompleted,
        teamId: membership.team.id,
        teamName: membership.team.name,
        placement: tt.placement,
        roster: membership.team.players.map((tp) => ({
          id: tp.player.id,
          username: tp.player.username,
          avatarUrl: tp.player.avatarUrl,
          role: tp.role,
        })),
      });
    }
  }

  return entries.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

export async function getTournamentData(userId: number, selectedTournamentId?: string) {
  return getCachedTournamentData(userId, selectedTournamentId ?? "");
}

export async function getStageScores(userId: number, tournamentId: string, stageId: string) {
  return getCachedStageScores(userId, tournamentId, stageId);
}

async function getCachedTournamentData(userId: number, selectedTournamentId: string) {
  "use cache";
  const cacheKey = selectedTournamentId || "active";
  cacheTag("tournament-data", `tournament-data-${userId}`, `tournament-data-${userId}-${cacheKey}`);
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });

  return fetchTournamentDataFromDb(userId, selectedTournamentId || undefined);
}

async function getCachedStageScores(userId: number, tournamentId: string, stageId: string) {
  "use cache";
  cacheTag(
    "stage-scores",
    `stage-scores-${userId}`,
    `stage-scores-${userId}-${tournamentId}`,
    `stage-scores-${userId}-${tournamentId}-${stageId}`,
  );
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });

  return fetchStageScoresFromDb(userId, tournamentId, stageId);
}

async function fetchStageScoresFromDb(userId: number, tournamentId: string, stageId: string) {
  const isAdmin = process.env.ADMIN_OSU_ID ? userId === Number(process.env.ADMIN_OSU_ID) : false;

  const stage = await prisma.stage.findFirst({
    where: {
      id: stageId,
      tournamentId,
      tournament: isAdmin
        ? undefined
        : {
            OR: [
              { keepers: { some: { playerId: userId } } },
              { teams: { some: { team: { players: { some: { playerId: userId, status: "ACCEPTED" } } } } } },
            ],
          },
    },
    select: {
      name: true,
      tournament: {
        select: {
          teams: {
            where: { team: { players: { some: { playerId: userId, status: "ACCEPTED" } } } },
            select: {
              team: {
                select: {
                  players: { select: { playerId: true } },
                },
              },
            },
          },
        },
      },
      maps: {
        select: {
          mapId: true,
          artist: true,
          songName: true,
          scores: {
            select: {
              id: true,
              playerId: true,
              score: true,
              accuracy: true,
              scoreType: true,
              playedMod: true,
              timestamp: true,
              player: { select: { id: true, username: true, avatarUrl: true } },
            },
            orderBy: { timestamp: 'desc' },
          },
        },
      },
    },
  });

  if (!stage) return [];

  const userTeam = stage.tournament.teams[0]?.team;
  const teamPlayerIds = userTeam ? new Set(userTeam.players.map((p) => p.playerId)) : null;

  return formatStageScores(stage.name, stage.maps, teamPlayerIds);
}

async function fetchTournamentDataFromDb(userId: number, selectedTournamentId?: string) {
  const isAdmin = process.env.ADMIN_OSU_ID ? userId === Number(process.env.ADMIN_OSU_ID) : false;

  const userFilter = isAdmin ? {} : { 
    OR: [
      { keepers: { some: { playerId: userId } } },
      { teams: { some: { team: { players: { some: { playerId: userId, status: "ACCEPTED" } } } } } }
    ]
  };

  const whereClause = selectedTournamentId ? { id: selectedTournamentId, ...userFilter } : { isCompleted: false, ...userFilter };
  
  const [tournament, allTournaments] = await Promise.all([
    prisma.tournament.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        keepers: { select: { playerId: true } },
        teams: {
          where: { team: { players: { some: { playerId: userId, status: "ACCEPTED" } } } },
          select: {
            placement: true,
            team: {
              select: {
                id: true,
                name: true,
                players: {
                  select: {
                    playerId: true,
                    role: true,
                    status: true,
                    player: { select: { id: true, username: true, avatarUrl: true } },
                  },
                },
              },
            },
          },
        },
        stages: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            maps: {
              select: {
                id: true,
                mapId: true,
                mod: true,
                artist: true,
                songName: true,
                beatmapId: true,
                skill: true,
              },
            },
          },
        },
      },
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

  if (!tournament) return { mappool: {}, activeTournament: null, stages: [], allTournaments: mappedAllTournaments };

  const isKeeper = isAdmin || tournament.keepers.some(k => k.playerId === userId);
  const userTeam = tournament.teams[0]?.team;

  const mappool: Record<string, MappoolMap[]> = {};
  const stages = tournament.stages.map(s => ({ id: s.id, name: s.name }));

  for (const stage of tournament.stages) {
    mappool[stage.name] = sortMappoolMaps(stage.maps.map(buildMappoolEntry));
  }

  return { 
    mappool,
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
