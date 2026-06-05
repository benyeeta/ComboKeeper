"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { getOsuToken, getCachedOsuUser } from "@/lib/osu";
import { ratelimit } from "@/lib/ratelimit";
import { z } from "zod";

async function verifyAdmin(teamId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;
  
  if (!currentUser) return { authorized: false, error: "You must be logged in to perform this action.", currentUser: null };
  
  const tp = await prisma.teamPlayer.findUnique({
    where: { teamId_playerId: { teamId, playerId: currentUser.id } }
  });
  
  if (!tp || (tp.role !== "CAPTAIN" && tp.role !== "EDITOR")) {
    return { authorized: false, error: "Forbidden: You must be a team Captain or Editor to perform this action.", currentUser };
  }
  
  return { authorized: true, error: null, currentUser };
}

async function verifyTeamMember(teamId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;
  
  if (!currentUser) return { authorized: false, error: "You must be logged in to perform this action.", currentUser: null, teamPlayer: null };
  
  const tp = await prisma.teamPlayer.findUnique({
    where: { teamId_playerId: { teamId, playerId: currentUser.id } }
  });
  
  if (!tp || tp.status !== "ACCEPTED") {
    return { authorized: false, error: "Forbidden: You must be an accepted team member to perform this action.", currentUser, teamPlayer: null };
  }
  
  return { authorized: true, error: null, currentUser, teamPlayer: tp };
}

export async function createTournament(formData: FormData) {
  const CreateTournamentSchema = z.object({
    name: z.string().min(1, "Tournament name is required").max(100, "Tournament name is too long"),
    acronym: z.string().max(20, "Acronym is too long").optional().catch(""),
    teamName: z.string().min(1, "Team name is required").max(100, "Team name is too long"),
    format: z.string().min(1, "Format is required"),
    rosterSize: z.coerce.number().min(1).max(32).default(8),
    copyFromId: z.string().optional(),
    players: z.string().optional().catch("").transform((val, ctx) => {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        return z.array(z.object({
          username: z.string().min(1, "Username is required").max(50, "Username is too long"),
          isAdmin: z.boolean()
        })).parse(parsed);
      } catch (e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid players data format." });
        return z.NEVER;
      }
    })
  });

  const validatedFields = CreateTournamentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message || "Validation failed." };
  }

  const { name, acronym, teamName, format, rosterSize, players: parsedPlayers, copyFromId } = validatedFields.data;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;

  if (currentUser) {
    const { success } = await ratelimit.limit(`createTournament_${currentUser.id}`);
    if (!success) {
      return { error: "You are creating tournaments too fast. Please wait a few seconds." };
    }
  }

  // 2. Create a new Team for this tournament workspace
  const team = await prisma.team.create({
    data: { name: teamName }
  });

  // 3. Create the new tournament
  const tournament = await prisma.tournament.create({
    data: {
      name,
      acronym: acronym || null,
      format,
      rosterSize,
      isCompleted: false,
      teamId: team.id,
    },
  });

  // Get API token to fetch player IDs dynamically
  let tokenData = null;
  if (parsedPlayers.length > 0) {
    const OSU_CLIENT_ID = process.env.OSU_CLIENT_ID;
    const OSU_CLIENT_SECRET = process.env.OSU_CLIENT_SECRET;
    if (OSU_CLIENT_ID && OSU_CLIENT_SECRET) {
      const tokenRes = await fetch("https://osu.ppy.sh/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: OSU_CLIENT_ID, client_secret: OSU_CLIENT_SECRET, grant_type: "client_credentials", scope: "public" }),
      });
      tokenData = await tokenRes.json();
    }
  }

  // Ensure the creator is safely recorded and elevated to CAPTAIN
  if (currentUser) {
    // Add the creator to the list of players to be processed if they aren't already there.
    if (!parsedPlayers.find(p => p.username.toLowerCase() === currentUser.username.toLowerCase())) {
      parsedPlayers.push({ username: currentUser.username, isAdmin: true });
    }
  }

  // Verify all players before modifying DB to prevent accidental roster wipes
  const resolvedPlayers = [];
  for (const p of parsedPlayers) {
    if (!p.username) continue;
    const userData = await getCachedOsuUser(p.username);
    if (!userData) return { error: `Could not find osu! user: ${p.username}` };
    
    resolvedPlayers.push({ userData, isAdmin: p.isAdmin });
  }

  // 4. Add players to the newly created team
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

    if (!isCreator && currentUser) {
      if (prisma.notification) {
        await prisma.notification.create({
          data: {
            userId: player.id,
            message: `${currentUser.username} invited you to join the team ${teamName} for ${name}.`,
            type: "TEAM_INVITE",
            teamId: team.id
          }
        });
      }
    }
  }

  // Ensure the creator is safely recorded and elevated to CAPTAIN
  if (currentUser) {
    await prisma.player.upsert({
      where: { id: currentUser.id },
      update: { username: currentUser.username, avatarUrl: currentUser.avatar_url },
      create: { id: currentUser.id, username: currentUser.username, avatarUrl: currentUser.avatar_url }
    });
    await prisma.teamPlayer.upsert({
      where: { teamId_playerId: { teamId: team.id, playerId: currentUser.id } },
      update: { role: "CAPTAIN", status: "ACCEPTED" },
      create: { teamId: team.id, playerId: currentUser.id, role: "CAPTAIN", status: "ACCEPTED" }
    });
  }


  // 5. Mappool Creation (Clone existing or start fresh)
  if (copyFromId) {
    const source = await prisma.tournament.findUnique({
      where: { id: copyFromId },
      include: { stages: { include: { maps: true } } }
    });
    if (source) {
      for (const stage of source.stages) {
        const newStage = await prisma.stage.create({
          data: { name: stage.name, tournamentId: tournament.id }
        });
        for (const map of stage.maps) {
          await prisma.mappoolMap.create({
            data: { mapId: map.mapId, mod: map.mod, artist: map.artist, songName: map.songName, skill: map.skill, beatmapId: map.beatmapId, stageId: newStage.id }
          });
        }
      }
    }
  } else {
    // Create standard mappool stages for a blank tournament
    const stages = ["Qualifiers", "Round of 32", "Quarterfinals", "Semifinals", "Finals", "Grand Finals"];
    for (const stageName of stages) {
      await prisma.stage.create({
        data: { name: stageName, tournamentId: tournament.id },
      });
    }
  }

  // Refresh the dashboard
  revalidatePath("/");
  return { success: true };
}

export async function checkDuplicateTournament(name: string) {
  if (!name) return null;
  
  // Find all tournaments with the exact same name
  const existings = await prisma.tournament.findMany({
    where: { name },
    include: { stages: { include: { maps: true } } }
  });
  
  let bestMatch = null;
  let maxMaps = 0;
  
  // Find the one that has the most maps filled out
  for (const t of existings) {
    const mapCount = t.stages.reduce((acc, s) => acc + s.maps.length, 0);
    if (mapCount > maxMaps) { maxMaps = mapCount; bestMatch = t; }
  }
  
  if (!bestMatch || maxMaps === 0) return null;
  
  return { id: bestMatch.id, name: bestMatch.name, mapCount: maxMaps, stages: bestMatch.stages.map(s => ({ name: s.name, mapCount: s.maps.length })).filter(s => s.mapCount > 0) };
}

export async function updateTeamRoster(formData: FormData) {
  const teamId = formData.get("teamId") as string;
  const playersJson = formData.get("players") as string;

  if (!teamId) return { error: "Team ID is required." };

  const auth = await verifyAdmin(teamId);
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
  const tournament = await prisma.tournament.findFirst({ where: { teamId } });
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

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return { error: "Tournament not found" };
  const auth = await verifyAdmin(tournament.teamId);
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
  const map = await prisma.mappoolMap.findUnique({ where: { id }, include: { stage: { include: { tournament: true } } } });
  if (!map) return { error: "Map not found" };
  const auth = await verifyAdmin(map.stage.tournament.teamId);
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

export async function addManualScores(mappoolMapId: string, playerId: number, scores: { score: number; playedMod?: string }[], scoreType: string = "PRACTICE") {
  if (!mappoolMapId || !playerId || !scores || scores.length === 0) {
    return { error: "Missing required fields" };
  }

  const map = await prisma.mappoolMap.findUnique({ where: { id: mappoolMapId }, include: { stage: { include: { tournament: true } } } });
  if (!map) return { error: "Map not found" };
  const auth = await verifyTeamMember(map.stage.tournament.teamId);
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

  const score = await prisma.score.findUnique({ where: { id }, include: { mappoolMap: { include: { stage: { include: { tournament: true } } } } } });
  if (!score) return { error: "Score not found" };
  const auth = await verifyTeamMember(score.mappoolMap.stage.tournament.teamId);
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

export async function updateScoreType(id: string, newScoreType: string) {
  if (!id || !newScoreType) {
    return { error: "Missing required fields." };
  }

  const score = await prisma.score.findUnique({ where: { id }, include: { mappoolMap: { include: { stage: { include: { tournament: true } } } } } });
  if (!score) return { error: "Score not found" };
  const auth = await verifyTeamMember(score.mappoolMap.stage.tournament.teamId);
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

export async function finishTournament(formData: FormData) {
  const tournamentId = formData.get("tournamentId") as string;
  const placement = formData.get("placement") as string;

  if (!tournamentId) return { error: "Missing tournament ID." };

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return { error: "Tournament not found" };
  const auth = await verifyAdmin(tournament.teamId);
  if (!auth.authorized) return { error: auth.error };

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { isCompleted: true, placement: placement || null }
  });

  revalidatePath("/");
  return { success: true };
}

export async function reopenTournament(formData: FormData) {
  const tournamentId = formData.get("tournamentId") as string;

  if (!tournamentId) return { error: "Missing tournament ID." };

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return { error: "Tournament not found" };
  const auth = await verifyAdmin(tournament.teamId);
  if (!auth.authorized) return { error: auth.error };

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { isCompleted: false, placement: null }
  });

  revalidatePath("/");
  return { success: true };
}

export async function deleteTournament(tournamentId: string, teamId: string) {
  const auth = await verifyAdmin(teamId);
  if (!auth.authorized) return { error: auth.error };

  await prisma.tournament.delete({ where: { id: tournamentId } });

  // If this was the only tournament for this team, delete the team too to prevent orphans
  const remainingTournaments = await prisma.tournament.count({ where: { teamId } });
  if (remainingTournaments === 0) {
    await prisma.team.delete({ where: { id: teamId } });
  }

  revalidatePath("/");
  return { success: true };
}

export async function importMatchScores(url: string, tournamentId: string, scoreType: string) {
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
      team: { include: { players: true } },
      stages: { include: { maps: true } }
    }
  });

  if (!tournament) return { error: "Active tournament not found." };

  const auth = await verifyTeamMember(tournament.teamId);
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
  const validPlayerIds = new Set(
    tournament.team.players.filter(p => p.status === "ACCEPTED" && (isAdmin || p.playerId === currentUser?.id)).map(p => p.playerId)
  );

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
  const manualScoresToDelete = new Set<string>();

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
        // If there's an existing manual score (0 accuracy) with this exact score value, mark it for replacement
        const manualDup = existingScores.find(s => s.accuracy === 0 && s.playerId === score.user_id && s.mappoolMapId === dbMapId && s.score === score.score);
        if (manualDup) {
          manualScoresToDelete.add(manualDup.id);
        }

        scoresToInsert.push({ score: score.score, accuracy: score.accuracy * 100, scoreType, playerId: score.user_id, mappoolMapId: dbMapId, timestamp: playDate });
        existingSet.add(uniqueKey);
      }
    }
  }

  if (scoresToInsert.length === 0) {
    return { error: "Match found, but no scores matched your current mappool and team roster." };
  }

  if (manualScoresToDelete.size > 0) {
    await prisma.score.deleteMany({ where: { id: { in: Array.from(manualScoresToDelete) } } });
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
      team: { 
        include: { 
          players: { include: { player: true } } 
        } 
      },
      stages: { include: { maps: true } }
    }
  });

  if (!tournament) return { error: "Active tournament not found." };

  const auth = await verifyTeamMember(tournament.teamId);
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
  for (const p of tournament.team.players.filter(p => p.status === "ACCEPTED" && (isAdmin || p.playerId === currentUser?.id))) {
    // Normalize usernames by stripping spaces and underscores for a bulletproof match
    usernameToPlayerId.set(p.player.username.toLowerCase().replace(/[_ ]/g, ''), p.playerId);
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
        reader.readShort(); // nGeki
        reader.readShort(); // nKatu
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
            const totalHits = n300 + n100 + n50 + nMiss;
            const accuracy = totalHits > 0 ? ((n300 * 300 + n100 * 100 + n50 * 50) / (totalHits * 300)) * 100 : 0;
            
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
  
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return { error: "Tournament not found" };
  const auth = await verifyAdmin(tournament.teamId);
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
  
  const stage = await prisma.stage.findUnique({ where: { id: stageId }, include: { tournament: true } });
  if (!stage) return { error: "Stage not found" };
  const auth = await verifyAdmin(stage.tournament.teamId);
  if (!auth.authorized) return { error: auth.error };

  await prisma.stage.delete({ where: { id: stageId } });
  
  revalidatePath("/");
  return { success: true };
}