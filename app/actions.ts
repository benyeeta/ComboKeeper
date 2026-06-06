"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { getOsuToken, getCachedOsuUser } from "@/lib/osu";
import { ratelimit } from "@/lib/ratelimit";
import { z } from "zod";

async function verifyKeeper(tournamentId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;
  
  if (!currentUser) return { authorized: false, error: "You must be logged in to perform this action.", currentUser: null };
  
  // Fallback to allow the global admin to act as a keeper for all tournaments
  if (process.env.ADMIN_OSU_ID && currentUser.id === Number(process.env.ADMIN_OSU_ID)) {
    return { authorized: true, error: null, currentUser };
  }

  const tk = await prisma.tournamentKeeper.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId: currentUser.id } }
  });
  
  if (!tk) {
    return { authorized: false, error: "Forbidden: You must be a Tournament Keeper.", currentUser };
  }
  
  return { authorized: true, error: null, currentUser };
}

async function verifyTeamCaptain(teamId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;
  if (!currentUser) return { authorized: false, error: "Not logged in", currentUser: null };
  const tp = await prisma.teamPlayer.findUnique({ where: { teamId_playerId: { teamId, playerId: currentUser.id } } });
  if (!tp || tp.status !== 'ACCEPTED' || tp.role !== 'CAPTAIN') return { authorized: false, error: "Forbidden: You must be a Team Captain.", currentUser };
  return { authorized: true, error: null, currentUser, teamPlayer: tp };
}

async function verifyTournamentTeamMember(tournamentId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;
  
  if (!currentUser) return { authorized: false, error: "You must be logged in to perform this action.", currentUser: null, teamPlayer: null };
  
  const tt = await prisma.tournamentTeam.findFirst({
    where: { tournamentId, team: { players: { some: { playerId: currentUser.id, status: "ACCEPTED" } } } },
    include: { team: { include: { players: true } } }
  });
  
  if (!tt) {
    return { authorized: false, error: "Forbidden: You must be an accepted team member to perform this action.", currentUser, teamPlayer: null };
  }
  
  const tp = tt.team.players.find(p => p.playerId === currentUser.id);
  return { authorized: true, error: null, currentUser, teamPlayer: tp };
}

export async function createTournament(formData: FormData) {
  const CreateTournamentSchema = z.object({
    name: z.string().min(1, "Tournament name is required").max(100, "Tournament name is too long"),
    acronym: z.string().max(20, "Acronym is too long").optional().catch(""),
    format: z.string().min(1, "Format is required"),
    rosterSize: z.coerce.number().min(1).max(32).default(8)
  });

  const validatedFields = CreateTournamentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message || "Validation failed." };
  }

  const { name, acronym, format, rosterSize } = validatedFields.data;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;

  if (currentUser) {
    const { success } = await ratelimit.limit(`createTournament_${currentUser.id}`);
    if (!success) {
      return { error: "You are creating tournaments too fast. Please wait a few seconds." };
    }
  }

  const tournament = await prisma.tournament.create({
    data: {
      name,
      acronym: acronym || null,
      format,
      rosterSize,
      isCompleted: false
    },
  });

  if (currentUser) {
    await prisma.player.upsert({
      where: { id: currentUser.id },
      update: { username: currentUser.username, avatarUrl: currentUser.avatar_url },
      create: { id: currentUser.id, username: currentUser.username, avatarUrl: currentUser.avatar_url }
    });
    await prisma.tournamentKeeper.create({
      data: { tournamentId: tournament.id, playerId: currentUser.id }
    });
  }

  const stages = ["Qualifiers", "Round of 32", "Quarterfinals", "Semifinals", "Finals", "Grand Finals"];
  for (const stageName of stages) {
    await prisma.stage.create({
      data: { name: stageName, tournamentId: tournament.id },
    });
  }

  // Refresh the dashboard
  revalidatePath("/");
  return { success: true };
}

export async function registerTeam(formData: FormData) {
  const teamName = formData.get("teamName") as string;
  const tournamentId = formData.get("tournamentId") as string;
  const playersJson = formData.get("players") as string;

  if (!teamName || !tournamentId) return { error: "Missing required fields." };

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;

  if (currentUser) {
    const { success } = await ratelimit.limit(`registerTeam_${currentUser.id}`);
    if (!success) return { error: "You are registering teams too fast. Please wait." };
  }

  const PlayerSchema = z.array(z.object({
    username: z.string().min(1).max(50),
    isAdmin: z.boolean()
  }));
  let parsedPlayers: z.infer<typeof PlayerSchema> = [];
  try { parsedPlayers = PlayerSchema.parse(JSON.parse(playersJson)); } 
  catch (e) { return { error: "Invalid players data format." }; }

  if (currentUser && !parsedPlayers.find(p => p.username.toLowerCase() === currentUser.username.toLowerCase())) {
    parsedPlayers.push({ username: currentUser.username, isAdmin: true });
  }

  const resolvedPlayers = [];
  for (const p of parsedPlayers) {
    if (!p.username) continue;
    const userData = await getCachedOsuUser(p.username);
    if (!userData) return { error: `Could not find osu! user: ${p.username}` };
    resolvedPlayers.push({ userData, isAdmin: p.isAdmin });
  }

  const team = await prisma.team.create({ data: { name: teamName } });
  await prisma.tournamentTeam.create({ data: { tournamentId, teamId: team.id } });

  for (const rp of resolvedPlayers) {
    const isCreator = currentUser && rp.userData.id === currentUser.id;
    const player = await prisma.player.upsert({
      where: { id: rp.userData.id },
      update: { username: rp.userData.username, avatarUrl: rp.userData.avatar_url },
      create: { id: rp.userData.id, username: rp.userData.username, avatarUrl: rp.userData.avatar_url }
    });

    await prisma.teamPlayer.create({
      data: { teamId: team.id, playerId: player.id, role: rp.isAdmin ? "CAPTAIN" : "PLAYER", status: isCreator ? "ACCEPTED" : "PENDING" }
    });

    if (!isCreator && currentUser && prisma.notification) {
      const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
      await prisma.notification.create({
        data: {
          userId: player.id,
          message: `${currentUser.username} invited you to join ${teamName} for ${tournament?.name || "a tournament"}.`,
          type: "TEAM_INVITE",
          teamId: team.id
        }
      });
    }
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateTeamRoster(formData: FormData) {
  const teamId = formData.get("teamId") as string;
  const playersJson = formData.get("players") as string;

  if (!teamId) return { error: "Team ID is required." };

  const auth = await verifyTeamCaptain(teamId);
  if (!auth.authorized) return { error: auth.error };
  const currentUser = auth.currentUser;

  if (currentUser) {
    const { success } = await ratelimit.limit(`updateTeamRoster_${currentUser.id}`);
    if (!success) {
      return { error: "You are updating the roster too fast. Please wait a few seconds." };
    }
  }

  // Define the exact shape and limits of the expected data
  const PlayerSchema = z.array(z.object({
    username: z.string().min(1, "Username is required").max(50, "Username is too long"),
    isAdmin: z.boolean()
  }));

  let parsedPlayers: z.infer<typeof PlayerSchema> = [];
  if (playersJson) {
    try {
      const rawParsed = JSON.parse(playersJson);
      parsedPlayers = PlayerSchema.parse(rawParsed); // Throws an error if the shape is wrong
    } catch (e) {
      return { error: "Invalid players data format provided." };
    }
  }

  const existingTeamPlayers = await prisma.teamPlayer.findMany({ where: { teamId } });
  const existingIds = new Set(existingTeamPlayers.map(tp => tp.playerId));

  // 1. Fetch osu! user data for all submitted players
  const resolvedPlayers = [];
  for (const p of parsedPlayers) {
    if (!p.username) continue;
    const userData = await getCachedOsuUser(p.username);
    if (!userData) return { error: `Could not find osu! user: ${p.username}` };
    resolvedPlayers.push({ userData, isAdmin: p.isAdmin });
  }

  const newIds = new Set(resolvedPlayers.map(rp => rp.userData.id));

  // 2. Remove players that are no longer in the submitted list
  const toRemove = [...existingIds].filter(id => !newIds.has(id));
  if (toRemove.length > 0) {
    await prisma.teamPlayer.deleteMany({
      where: { teamId, playerId: { in: toRemove } }
    });
  }

  // Fetch the tournament name to use in the notification
  const tournament = await prisma.tournament.findFirst({ where: { teams: { some: { teamId } } } });
  const tournamentName = tournament?.name || "a tournament";

  // 3. Add new players and update existing ones
  for (const rp of resolvedPlayers) {
    const isCurrentUser = currentUser && rp.userData.id === currentUser.id;

    const player = await prisma.player.upsert({
      where: { id: rp.userData.id },
      update: { username: rp.userData.username, avatarUrl: rp.userData.avatar_url },
      create: { id: rp.userData.id, username: rp.userData.username, avatarUrl: rp.userData.avatar_url }
    });

    if (!existingIds.has(player.id)) {
      // New player -> PENDING, and send a notification
      await prisma.teamPlayer.create({
        data: {
          teamId,
          playerId: player.id,
          role: rp.isAdmin ? "CAPTAIN" : "PLAYER",
          status: isCurrentUser ? "ACCEPTED" : "PENDING"
        }
      });

      if (!isCurrentUser && currentUser && prisma.notification) {
        await prisma.notification.create({
          data: {
            userId: player.id,
            message: `${currentUser.username} invited you to join their team for ${tournamentName}.`,
            type: "TEAM_INVITE",
            teamId
          }
        });
      }
    } else {
      // Existing player -> Update their role
      await prisma.teamPlayer.update({
        where: { teamId_playerId: { teamId, playerId: player.id } },
        data: { role: rp.isAdmin ? "CAPTAIN" : "PLAYER" }
      });
    }
  }

  revalidatePath("/");
  return { success: true };
}

export async function addMapsToStage(formData: FormData) {
  let stageId = formData.get("stageId") as string;
  const stageName = formData.get("stageName") as string;
  const tournamentId = formData.get("tournamentId") as string;
  const mapsJson = formData.get("maps") as string;

  if (!tournamentId || !mapsJson) return { error: "Missing required fields" };

  const auth = await verifyKeeper(tournamentId);
  if (!auth.authorized) return { error: auth.error };
  const currentUser = auth.currentUser;

  if (currentUser) {
    const { success } = await ratelimit.limit(`addMapsToStage_${currentUser.id}`);
    if (!success) {
      return { error: "You are adding maps too fast. Please wait a few seconds." };
    }
  }

  const MapsSchema = z.array(z.object({
    mod: z.string(),
    mapId: z.string(),
    beatmapId: z.string()
  }));

  let maps: z.infer<typeof MapsSchema> = [];
  try {
    maps = MapsSchema.parse(JSON.parse(mapsJson));
  } catch (e) {
    return { error: "Invalid maps data provided." };
  }

  if (maps.length === 0) return { error: "No maps provided." };

  // If the stage doesn't exist in the DB yet, create it dynamically
  if (!stageId && stageName && tournamentId) {
    let stage = await prisma.stage.findFirst({ where: { name: stageName, tournamentId } });
    if (!stage) {
      stage = await prisma.stage.create({ data: { name: stageName, tournamentId } });
    }
    stageId = stage.id;
  }

  // Check for duplicate map IDs in the same stage
  const existingMaps = await prisma.mappoolMap.findMany({
    where: { stageId, mapId: { in: maps.map(m => m.mapId) } }
  });
  if (existingMaps.length > 0) {
    return { error: `Slot(s) ${existingMaps.map(m => m.mapId).join(", ")} already exist in this stage. Delete them first.` };
  }

  // Authenticate with the osu! API as a bot to fetch map metadata
  const tokenData = await getOsuToken();
  if (!tokenData?.access_token) return { error: "Failed to authenticate with osu! API." };

  // Fetch multiple beatmaps from osu! API in chunks of 50
  const beatmapIds = Array.from(new Set(maps.map(m => m.beatmapId)));
  const beatmapMetadata = new Map();

  for (let i = 0; i < beatmapIds.length; i += 50) {
    const chunk = beatmapIds.slice(i, i + 50);
    const url = `https://osu.ppy.sh/api/v2/beatmaps?${chunk.map(id => `ids[]=${id}`).join('&')}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    if (res.ok) {
      const data = await res.json();
      for (const b of data.beatmaps) {
        beatmapMetadata.set(b.id.toString(), b);
      }
    }
  }

  const mapsToInsert = [];
  for (const map of maps) {
    const bm = beatmapMetadata.get(map.beatmapId);
    if (!bm || !bm.beatmapset) {
      return { error: `Beatmap with ID ${map.beatmapId} not found.` };
    }
    mapsToInsert.push({
      mapId: map.mapId,
      mod: map.mod,
      artist: bm.beatmapset.artist,
      songName: bm.beatmapset.title,
      skill: null,
      beatmapId: parseInt(map.beatmapId, 10),
      stageId,
    });
  }

  // Perform a single bulk database insert
  await prisma.mappoolMap.createMany({
    data: mapsToInsert
  });

  // Refresh the dashboard
  revalidatePath("/");
  return { success: true };
}

export async function deleteMap(id: string) {
  const map = await prisma.mappoolMap.findUnique({ where: { id }, include: { stage: true } });
  if (!map) return { error: "Map not found" };
  const auth = await verifyKeeper(map.stage.tournamentId);
  if (!auth.authorized) return { error: auth.error };
  const currentUser = auth.currentUser;

  if (currentUser) {
    const { success } = await ratelimit.limit(`deleteMap_${currentUser.id}`);
    if (!success) {
      return { error: "You are deleting maps too fast. Please wait a few seconds." };
    }
  }

  await prisma.mappoolMap.delete({
    where: { id }
  });
  
  revalidatePath("/");
  return { success: true };
}

export async function deleteMaps(ids: string[]) {
  if (!ids || ids.length === 0) return { error: "No maps selected for deletion." };

  const maps = await prisma.mappoolMap.findMany({ where: { id: { in: ids } }, include: { stage: true } });
  if (maps.length === 0) return { error: "Maps not found" };

  const auth = await verifyKeeper(maps[0].stage.tournamentId);
  if (!auth.authorized) return { error: auth.error };

  if (auth.currentUser) {
    const { success } = await ratelimit.limit(`deleteMaps_${auth.currentUser.id}`);
    if (!success) {
      return { error: "You are deleting maps too fast. Please wait a few seconds." };
    }
  }

  await prisma.mappoolMap.deleteMany({ where: { id: { in: ids } } });
  
  revalidatePath("/");
  return { success: true };
}

export async function addManualScores(mappoolMapId: string, playerId: number, scores: { score: number; playedMod?: string }[], scoreType: string = "PRACTICE") {
  if (!mappoolMapId || !playerId || !scores || scores.length === 0) {
    return { error: "Missing required fields" };
  }

  const map = await prisma.mappoolMap.findUnique({ where: { id: mappoolMapId }, include: { stage: { include: { tournament: true } } } });
  if (!map) return { error: "Map not found" };
  const auth = await verifyTournamentTeamMember(map.stage.tournamentId);
  if (!auth.authorized) return { error: auth.error };
  if (auth.teamPlayer?.role === "PLAYER" && playerId !== auth.currentUser?.id) {
    return { error: "Forbidden: You can only add scores for yourself." };
  }
  const currentUser = auth.currentUser;

  if (currentUser) {
    const { success } = await ratelimit.limit(`addManualScores_${currentUser.id}`);
    if (!success) {
      return { error: "You are adding scores too fast. Please wait a few seconds." };
    }
  }

  await prisma.score.createMany({
    data: scores.map(entry => ({
      score: entry.score,
      accuracy: 0, // Default to 0 since the manual entry UI doesn't collect accuracy yet
      playerId,
      mappoolMapId,
      scoreType,
      playedMod: entry.playedMod,
    }))
  });

  if (currentUser && playerId !== currentUser.id) {
    if (map) {
      await prisma.notification.create({
        data: {
          userId: playerId,
          message: `${currentUser.username} added ${scores.length} ${scoreType.toLowerCase()} score(s) for you on ${map.mapId} (${map.stage.tournament.name}).`
        }
      });
    }
  }
  
  revalidatePath("/");
  return { success: true };
}

export async function deleteScore(id: string) {
  if (!id) {
    return { error: "Score ID is missing." };
  }

  const score = await prisma.score.findUnique({ where: { id }, include: { mappoolMap: { include: { stage: true } } } });
  if (!score) return { error: "Score not found" };
  const auth = await verifyTournamentTeamMember(score.mappoolMap.stage.tournamentId);
  if (!auth.authorized) return { error: auth.error };
  if (auth.teamPlayer?.role === "PLAYER" && score.playerId !== auth.currentUser?.id) {
    return { error: "Forbidden: You can only delete your own scores." };
  }
  const currentUser = auth.currentUser;

  if (currentUser) {
    const { success } = await ratelimit.limit(`deleteScore_${currentUser.id}`);
    if (!success) {
      return { error: "You are deleting scores too fast. Please wait a few seconds." };
    }
  }

  await prisma.score.delete({
    where: { id }
  });
  
  revalidatePath("/");
  return { success: true };
}

export async function deleteScores(ids: string[]) {
  if (!ids || ids.length === 0) return { error: "No scores selected for deletion." };

  const scores = await prisma.score.findMany({ where: { id: { in: ids } }, include: { mappoolMap: { include: { stage: true } } } });
  if (scores.length === 0) return { error: "Scores not found" };

  // Verify based on the first score (assuming all belong to the same tournament)
  const auth = await verifyTournamentTeamMember(scores[0].mappoolMap.stage.tournamentId);
  if (!auth.authorized) return { error: auth.error };

  const isAdmin = auth.teamPlayer?.role === "CAPTAIN" || auth.teamPlayer?.role === "EDITOR";

  if (!isAdmin) {
    const allOwnScores = scores.every(s => s.playerId === auth.currentUser?.id);
    if (!allOwnScores) {
      return { error: "Forbidden: You can only delete your own scores." };
    }
  }

  if (auth.currentUser) {
    const { success } = await ratelimit.limit(`deleteScores_${auth.currentUser.id}`);
    if (!success) {
      return { error: "You are deleting scores too fast. Please wait a few seconds." };
    }
  }

  await prisma.score.deleteMany({
    where: { id: { in: ids } }
  });
  
  revalidatePath("/");
  return { success: true };
}

export async function updateScoreType(id: string, newScoreType: string) {
  if (!id || !newScoreType) {
    return { error: "Missing required fields." };
  }

  const score = await prisma.score.findUnique({ where: { id }, include: { mappoolMap: { include: { stage: true } } } });
  if (!score) return { error: "Score not found" };
  const auth = await verifyTournamentTeamMember(score.mappoolMap.stage.tournamentId);
  if (!auth.authorized) return { error: auth.error };
  if (auth.teamPlayer?.role === "PLAYER" && score.playerId !== auth.currentUser?.id) {
    return { error: "Forbidden: You can only edit your own scores." };
  }
  const currentUser = auth.currentUser;

  if (currentUser) {
    const { success } = await ratelimit.limit(`updateScore_${currentUser.id}`);
    if (!success) {
      return { error: "You are updating scores too fast. Please wait a few seconds." };
    }
  }

  await prisma.score.update({
    where: { id },
    data: { scoreType: newScoreType }
  });
  
  revalidatePath("/");
  return { success: true };
}

export async function toggleTournamentStatus(tournamentId: string, isCompleted: boolean) {
  if (!tournamentId) return { error: "Missing tournament ID." };

  const auth = await verifyKeeper(tournamentId);
  if (!auth.authorized) return { error: auth.error };

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { isCompleted }
  });

  revalidatePath("/");
  return { success: true };
}

export async function updateTeamPlacement(formData: FormData) {
  const tournamentId = formData.get("tournamentId") as string;
  const teamId = formData.get("teamId") as string;
  const placement = formData.get("placement") as string;

  if (!tournamentId || !teamId) return { error: "Missing required fields." };

  const auth = await verifyTeamCaptain(teamId);
  if (!auth.authorized) return { error: auth.error };

  await prisma.tournamentTeam.update({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    data: { placement: placement || null }
  });

  revalidatePath("/");
  return { success: true };
}

export async function deleteTournament(tournamentId: string) {
  const auth = await verifyKeeper(tournamentId);
  if (!auth.authorized) return { error: auth.error };

  await prisma.tournament.delete({ where: { id: tournamentId } });

  revalidatePath("/");
  return { success: true };
}

export async function importMatchScores(url: string, tournamentId: string, scoreType: string, overwriteDuplicates: boolean = false) {
  if (!url || !tournamentId) return { error: "Missing required fields." };

  let matchId = "";
  const matchRegex = /matches\/(\d+)/;
  if (matchRegex.test(url)) {
    matchId = url.match(matchRegex)![1];
  } else if (/^\d+$/.test(url.trim())) {
    matchId = url.trim();
  } else {
    return { error: "Invalid match URL. Please paste a valid osu! multiplayer link." };
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      teams: { include: { team: { include: { players: true } } } },
      stages: { include: { maps: true } }
    }
  });

  if (!tournament) return { error: "Active tournament not found." };

  const auth = await verifyTournamentTeamMember(tournamentId);
  if (!auth.authorized) return { error: auth.error };
  const currentUser = auth.currentUser;
  const isAdmin = auth.teamPlayer?.role !== "PLAYER";

  if (currentUser) {
    const { success } = await ratelimit.limit(`importMatchScores_${currentUser.id}`);
    if (!success) {
      return { error: "You are importing match scores too fast. Please wait a few seconds." };
    }
  }

  const validBeatmapIds = new Map();
  for (const s of tournament.stages) {
    for (const m of s.maps) {
      if (m.beatmapId) validBeatmapIds.set(m.beatmapId, m.id);
    }
  }
  
  let validPlayerIds = new Set();
  const userTt = tournament.teams.find(tt => tt.team.players.some(p => p.playerId === currentUser?.id));
  if (userTt) {
    validPlayerIds = new Set(userTt.team.players.filter(p => p.status === "ACCEPTED" && (isAdmin || p.playerId === currentUser?.id)).map(p => p.playerId));
  }

  const tokenData = await getOsuToken();
  if (!tokenData?.access_token) return { error: "Failed to authenticate with osu! API." };

  const matchRes = await fetch(`https://osu.ppy.sh/api/v2/matches/${matchId}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  
  if (!matchRes.ok) return { error: `Could not fetch match ${matchId} from osu!.` };
  const matchData = await matchRes.json();
  if (!matchData.events) return { error: "No events found in this match." };

  // Fetch existing scores to prevent duplicates
  const existingScores = await prisma.score.findMany({
    where: { mappoolMapId: { in: Array.from(validBeatmapIds.values()) } },
    select: { id: true, playerId: true, mappoolMapId: true, score: true, timestamp: true, accuracy: true }
  });
  const existingSet = new Set(
    existingScores.map(s => `${s.playerId}_${s.mappoolMapId}_${s.score}_${Math.floor(s.timestamp.getTime() / 1000)}`)
  );
  const scoresToDelete = new Set<string>();

  const scoresToInsert = [];
  for (const event of matchData.events) {
    if (!event.game || !event.game.beatmap_id) continue;
    const dbMapId = validBeatmapIds.get(event.game.beatmap_id);
    if (!dbMapId) continue; // Skip maps that aren't in the tournament mappool

    for (const score of event.game.scores) {
      if (!validPlayerIds.has(score.user_id) || score.score === 0) continue; // Skip opponents or aborted scores
      
      const playDate = new Date(event.timestamp);
      const uniqueKey = `${score.user_id}_${dbMapId}_${score.score}_${Math.floor(playDate.getTime() / 1000)}`;
      if (!existingSet.has(uniqueKey)) {
            // Check if there is an existing score with the exact same value
            const existingDup = existingScores.find(s => s.playerId === score.user_id && s.mappoolMapId === dbMapId && s.score === score.score);
            
            if (existingDup) {
              if (existingDup.accuracy === 0 || overwriteDuplicates) {
                scoresToDelete.add(existingDup.id);
              } else {
                // Skip importing to avoid duplicate entries for the same play
                continue;
              }
        }

        scoresToInsert.push({ score: score.score, accuracy: score.accuracy * 100, scoreType, playerId: score.user_id, mappoolMapId: dbMapId, timestamp: playDate });
        existingSet.add(uniqueKey);
      }
    }
  }

  if (scoresToInsert.length === 0) {
    return { error: "Match found, but no scores matched your current mappool and team roster." };
  }

  if (scoresToDelete.size > 0) {
    await prisma.score.deleteMany({ where: { id: { in: Array.from(scoresToDelete) } } });
  }
  await prisma.score.createMany({ data: scoresToInsert });
  revalidatePath("/");
  return { message: `Successfully imported ${scoresToInsert.length} scores!` };
}

class OsuDbReader {
  view: DataView;
  offset: number = 0;
  decoder = new TextDecoder();
  constructor(buffer: ArrayBuffer) { this.view = new DataView(buffer); }
  readByte() { const b = this.view.getUint8(this.offset); this.offset += 1; return b; }
  readShort() { const s = this.view.getUint16(this.offset, true); this.offset += 2; return s; }
  readInt() { const i = this.view.getUint32(this.offset, true); this.offset += 4; return i; }
  readLong() { const l = this.view.getBigUint64(this.offset, true); this.offset += 8; return l; }
  readDouble() { const d = this.view.getFloat64(this.offset, true); this.offset += 8; return d; }
  readBool() { return this.readByte() !== 0; }
  readString() {
    const flag = this.readByte();
    if (flag === 0x00) return "";
    if (flag !== 0x0b) throw new Error("Invalid string flag");
    let len = 0; let shift = 0;
    while (true) {
      const byte = this.readByte();
      len |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }
    const strBytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
    const str = this.decoder.decode(strBytes);
    this.offset += len;
    return str;
  }
}

export async function importDbScores(formData: FormData) {
  const file = formData.get("file") as File;
  const tournamentId = formData.get("tournamentId") as string;
  const scoreType = formData.get("scoreType") as string;

  if (!file || !tournamentId) return { error: "Missing required fields." };

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      teams: {
        include: {
          team: { include: { players: { include: { player: true } } } }
        }
      },
      stages: { include: { maps: true } }
    }
  });

  if (!tournament) return { error: "Active tournament not found." };

  const auth = await verifyTournamentTeamMember(tournamentId);
  if (!auth.authorized) return { error: auth.error };
  const currentUser = auth.currentUser;
  const isAdmin = auth.teamPlayer?.role !== "PLAYER";

  if (currentUser) {
    const { success } = await ratelimit.limit(`importDbScores_${currentUser.id}`);
    if (!success) {
      return { error: "You are importing local scores too fast. Please wait a few seconds." };
    }
  }

  const validBeatmapIds = new Map();
  for (const s of tournament.stages) {
    for (const m of s.maps) {
      if (m.beatmapId) validBeatmapIds.set(m.beatmapId, m.id);
    }
  }
  if (validBeatmapIds.size === 0) return { error: "No maps with valid osu! beatmap IDs found in this tournament." };

  const tokenData = await getOsuToken();
  if (!tokenData?.access_token) return { error: "Failed to authenticate with osu! API." };

  // Fetch the MD5 Checksums for our tournament maps from the osu! API
  const beatmapIds = Array.from(validBeatmapIds.keys());
  const checksumToMapId = new Map();

  for (let i = 0; i < beatmapIds.length; i += 50) {
    const chunk = beatmapIds.slice(i, i + 50);
    const url = `https://osu.ppy.sh/api/v2/beatmaps?${chunk.map(id => `ids[]=${id}`).join('&')}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    if (!res.ok) continue;
    const data = await res.json();
    for (const b of data.beatmaps) checksumToMapId.set(b.checksum, validBeatmapIds.get(b.id));
  }

  const usernameToPlayerId = new Map();
  const userTtDb = tournament.teams.find(tt => tt.team.players.some(p => p.playerId === currentUser?.id));
  if (userTtDb) {
    for (const p of userTtDb.team.players.filter(p => p.status === "ACCEPTED" && (isAdmin || p.playerId === currentUser?.id))) {
      usernameToPlayerId.set(p.player.username.toLowerCase().replace(/[_ ]/g, ''), p.playerId);
    }
  }

  const scoresToInsert = [];
  let matchedMapsCount = 0;
  let matchedMapScoresCount = 0;

  // Fetch existing scores to prevent duplicates
  const existingScores = await prisma.score.findMany({
    where: { mappoolMapId: { in: Array.from(validBeatmapIds.values()) } },
    select: { id: true, playerId: true, mappoolMapId: true, score: true, timestamp: true, accuracy: true }
  });
  const existingSet = new Set(
    existingScores.map(s => `${s.playerId}_${s.mappoolMapId}_${s.score}_${Math.floor(s.timestamp.getTime() / 1000)}`)
  );
  const manualScoresToDelete = new Set<string>();

  try {
    const buffer = await file.arrayBuffer();
    const reader = new OsuDbReader(buffer);

    const version = reader.readInt();
    const beatmapCount = reader.readInt();

    for (let i = 0; i < beatmapCount; i++) {
      const md5 = reader.readString();
      const scoreCount = reader.readInt();
      const dbMapId = checksumToMapId.get(md5);

      if (dbMapId && scoreCount > 0) matchedMapsCount++;

      for (let j = 0; j < scoreCount; j++) {
        const mode = reader.readByte();
        reader.readInt(); // scoreVersion
        reader.readString(); // beatmapMd5
        const playerName = reader.readString();
        reader.readString(); // replayMd5
        const n300 = reader.readShort();
        const n100 = reader.readShort();
        const n50 = reader.readShort();
        const nGeki = reader.readShort();
        const nKatu = reader.readShort();
        const nMiss = reader.readShort();
        const replayScore = reader.readInt();
        reader.readShort(); // maxCombo
        reader.readBool(); // perfectCombo
        const mods = reader.readInt();
        reader.readString(); // empty
        const timestampTicks = reader.readLong(); // timestamp
        reader.readInt(); // emptyInt
        reader.readLong(); // scoreId

        if ((mods & 8388608) !== 0) reader.readDouble(); // Target practice mod carries extra double

        if (dbMapId) { // Support all osu! gamemodes
          matchedMapScoresCount++;
          const normalizedName = playerName.toLowerCase().replace(/[_ ]/g, '');
          const playerId = usernameToPlayerId.get(normalizedName);
          if (playerId) {
            let accuracy = 0;
            if (mode === 0) { // Standard
              const totalHits = n300 + n100 + n50 + nMiss;
              accuracy = totalHits > 0 ? ((n300 * 300 + n100 * 100 + n50 * 50) / (totalHits * 300)) * 100 : 0;
            } else if (mode === 1) { // Taiko
              const totalHits = n300 + n100 + nMiss;
              accuracy = totalHits > 0 ? ((n300 * 300 + n100 * 150) / (totalHits * 300)) * 100 : 0;
            } else if (mode === 2) { // Catch
              const totalHits = n300 + n100 + n50 + nKatu + nMiss;
              accuracy = totalHits > 0 ? ((n300 + n100 + n50) / totalHits) * 100 : 0;
            } else if (mode === 3) { // Mania
              const totalHits = nGeki + n300 + nKatu + n100 + n50 + nMiss;
              accuracy = totalHits > 0 ? ((nGeki * 300 + n300 * 300 + nKatu * 200 + n100 * 100 + n50 * 50) / (totalHits * 300)) * 100 : 0;
            }
            
            // Parse osu! bitmask to string
            let playedMod = "NM";
            if (mods > 0) {
              const modAcronyms = [];
              if (mods & 2) modAcronyms.push("EZ");
              if (mods & 8) modAcronyms.push("HD");
              if (mods & 16) modAcronyms.push("HR");
              if (mods & 64 && !(mods & 512)) modAcronyms.push("DT");
              if (mods & 512) modAcronyms.push("NC");
              if (mods & 1024) modAcronyms.push("FL");
              if (mods & 256) modAcronyms.push("HT");
              if (modAcronyms.length > 0) playedMod = modAcronyms.join("");
            }

            // osu! timestamps are in Windows ticks (100-nanosecond intervals since 0001-01-01)
            const playDate = new Date(Number(timestampTicks) / 10000 - 62135596800000);
            const uniqueKey = `${playerId}_${dbMapId}_${replayScore}_${Math.floor(playDate.getTime() / 1000)}`;
            
            if (!existingSet.has(uniqueKey)) {
              // If there's an existing manual score (0 accuracy) with this exact score value, mark it for replacement
              const manualDup = existingScores.find(s => s.accuracy === 0 && s.playerId === playerId && s.mappoolMapId === dbMapId && s.score === replayScore);
              if (manualDup) {
                manualScoresToDelete.add(manualDup.id);
              }

              scoresToInsert.push({ score: replayScore, accuracy, scoreType, playedMod, playerId, mappoolMapId: dbMapId, timestamp: playDate });
              existingSet.add(uniqueKey); // Prevent duplicates within the same file import
            }
          }
        }
      }
    }
  } catch (error) {
    return { error: "Failed to parse scores.db. The file might be corrupted or unsupported." };
  }

  if (scoresToInsert.length === 0) {
    if (matchedMapsCount === 0) return { error: "No scores found. None of your local scores match the API checksums of the maps in this tournament." };
    if (matchedMapScoresCount > 0) return { error: `Found ${matchedMapScoresCount} local scores for the mappool, but your local player name doesn't match anyone on the active team roster!` };
    return { error: "No solo scores found for this tournament's mappool." };
  }

  if (manualScoresToDelete.size > 0) {
    await prisma.score.deleteMany({ where: { id: { in: Array.from(manualScoresToDelete) } } });
  }
  await prisma.score.createMany({ data: scoresToInsert });
  revalidatePath("/");
  return { message: `Successfully imported ${scoresToInsert.length} solo scores!` };
}

export async function markNotificationsAsRead() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return;
  const user = await decrypt(sessionCookie);
  if (!user) return;

  if (prisma.notification) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false, type: { not: "TEAM_INVITE" } },
      data: { isRead: true }
    });
  }
}

export async function acceptInvite(notificationId: string, teamId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;
  if (!currentUser) return;

  const tp = await prisma.teamPlayer.findUnique({ where: { teamId_playerId: { teamId, playerId: currentUser.id } } });
  if (tp) {
    await prisma.teamPlayer.update({
      where: { teamId_playerId: { teamId, playerId: currentUser.id } },
      data: { status: "ACCEPTED" }
    });
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, type: "INFO", message: "You accepted the team invitation." }
  });

  // Notify the team captains of the acceptance
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  const captains = await prisma.teamPlayer.findMany({ where: { teamId, role: "CAPTAIN", status: "ACCEPTED" } });
  if (team && captains.length > 0 && prisma.notification) {
    await prisma.notification.createMany({
      data: captains.map(c => ({
        userId: c.playerId,
        message: `${currentUser.username} accepted the invitation to join ${team.name}.`,
        type: "INFO",
        teamId
      }))
    });
  }

  revalidatePath("/");
}

export async function rejectInvite(notificationId: string, teamId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;
  if (!currentUser) return;

  await prisma.teamPlayer.deleteMany({ where: { teamId, playerId: currentUser.id } });
  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, type: "INFO", message: "You declined the team invitation." }
  });

  // Notify the team captains of the rejection
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  const captains = await prisma.teamPlayer.findMany({ where: { teamId, role: "CAPTAIN", status: "ACCEPTED" } });
  if (team && captains.length > 0 && prisma.notification) {
    await prisma.notification.createMany({
      data: captains.map(c => ({
        userId: c.playerId,
        message: `${currentUser.username} declined the invitation to join ${team.name}.`,
        type: "INFO",
        teamId
      }))
    });
  }

  revalidatePath("/");
}

export async function leaveTeam(teamId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;
  if (!currentUser) return { error: "Not logged in" };

  await prisma.teamPlayer.deleteMany({ where: { teamId, playerId: currentUser.id } });
  revalidatePath("/");
  return { success: true };
}

export async function addStage(tournamentId: string, name: string) {
  if (!tournamentId || !name) return { error: "Missing required fields" };
  
  const auth = await verifyKeeper(tournamentId);
  if (!auth.authorized) return { error: auth.error };
  const currentUser = auth.currentUser;

  if (currentUser) {
    const { success } = await ratelimit.limit(`addStage_${currentUser.id}`);
    if (!success) {
      return { error: "You are adding stages too fast. Please wait a few seconds." };
    }
  }

  const existing = await prisma.stage.findFirst({ where: { tournamentId, name } });
  if (existing) return { error: "Stage already exists" };
  
  await prisma.stage.create({ data: { tournamentId, name } });
  
  revalidatePath("/");
  return { success: true };
}

export async function deleteStage(stageId: string) {
  if (!stageId) return { error: "Missing stage ID" };
  
  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage) return { error: "Stage not found" };
  const auth = await verifyKeeper(stage.tournamentId);
  if (!auth.authorized) return { error: auth.error };

  await prisma.stage.delete({ where: { id: stageId } });
  
  revalidatePath("/");
  return { success: true };
}

export async function updateStageMappool(formData: FormData) {
  const stageId = formData.get("stageId") as string;
  const mapsJson = formData.get("maps") as string;

  if (!stageId || !mapsJson) return { error: "Missing required fields" };

  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage) return { error: "Stage not found" };

  const auth = await verifyKeeper(stage.tournamentId);
  if (!auth.authorized) return { error: auth.error };

  if (auth.currentUser) {
    const { success } = await ratelimit.limit(`updateStageMappool_${auth.currentUser.id}`);
    if (!success) {
      return { error: "You are updating maps too fast. Please wait a few seconds." };
    }
  }

  const MapsSchema = z.array(z.object({
    dbId: z.string().optional(),
    mod: z.string(),
    mapId: z.string(),
    beatmapId: z.string()
  }));

  let maps: z.infer<typeof MapsSchema> = [];
  try {
    maps = MapsSchema.parse(JSON.parse(mapsJson));
  } catch (e) {
    return { error: "Invalid maps data provided." };
  }

  const existingMaps = await prisma.mappoolMap.findMany({ where: { stageId } });

  // 1. Delete maps removed from the modal
  const keptDbIds = new Set(maps.filter(m => m.dbId).map(m => m.dbId));
  const toDelete = existingMaps.filter(m => !keptDbIds.has(m.id)).map(m => m.id);
  if (toDelete.length > 0) {
    await prisma.mappoolMap.deleteMany({ where: { id: { in: toDelete } } });
  }

  // 2. Fetch metadata for newly added maps, or maps where the beatmapId was changed
  const needsMetadata = maps.filter(m => {
    if (!m.dbId) return true;
    const existing = existingMaps.find(em => em.id === m.dbId);
    return existing && existing.beatmapId?.toString() !== m.beatmapId;
  });

  const beatmapMetadata = new Map();
  if (needsMetadata.length > 0) {
    const tokenData = await getOsuToken();
    if (!tokenData?.access_token) return { error: "Failed to authenticate with osu! API." };

    const beatmapIds = Array.from(new Set(needsMetadata.map(m => m.beatmapId)));
    for (let i = 0; i < beatmapIds.length; i += 50) {
      const chunk = beatmapIds.slice(i, i + 50);
      const url = `https://osu.ppy.sh/api/v2/beatmaps?${chunk.map(id => `ids[]=${id}`).join('&')}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
      if (res.ok) {
        const data = await res.json();
        for (const b of data.beatmaps) beatmapMetadata.set(b.id.toString(), b);
      }
    }
  }

  // 3. Process updates and additions
  for (const map of maps) {
    let artist, songName;
    if (!map.dbId || needsMetadata.includes(map)) {
      const bm = beatmapMetadata.get(map.beatmapId);
      if (!bm || !bm.beatmapset) return { error: `Beatmap with ID ${map.beatmapId} not found.` };
      artist = bm.beatmapset.artist;
      songName = bm.beatmapset.title;
    }

    const payload = { mapId: map.mapId, mod: map.mod, ...(artist ? { artist, songName, beatmapId: parseInt(map.beatmapId, 10) } : {}) };
    if (map.dbId) {
      await prisma.mappoolMap.update({ where: { id: map.dbId }, data: payload });
    } else {
      await prisma.mappoolMap.create({ data: { stageId, ...payload, artist: artist!, songName: songName!, beatmapId: parseInt(map.beatmapId, 10) } });
    }
  }

  revalidatePath("/");
  return { success: true };
}

export async function getPopularTournaments() {
  const allTournaments = await prisma.tournament.findMany({
    where: { isCompleted: false }, // Only show active tournaments to join
    include: { stages: { include: { _count: { select: { maps: true } } } } }
  });

  const bestMatches = new Map();
  for (const t of allTournaments) {
    const mapCount = t.stages.reduce((acc: number, s: any) => acc + s._count.maps, 0);
    const existing = bestMatches.get(t.name);
    if (!existing || existing.mapCount < mapCount) {
      bestMatches.set(t.name, {
        id: t.id,
        name: t.name,
        acronym: t.acronym,
        format: t.format,
        rosterSize: t.rosterSize,
        mapCount
      });
    }
  }

  return Array.from(bestMatches.values()).sort((a: any, b: any) => b.mapCount - a.mapCount);
}