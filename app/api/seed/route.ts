import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import playersData from '@/lib/players.json';
import scoresData from '@/lib/scores.json';

// Your hardcoded Mappool so we can insert it into the database
const MOCK_MAPPOOL: Record<string, any[]> = {
  Qualifiers: [
    { id: "NM1", mod: "NM", artist: "xi", songName: "over the top", skill: "Stream consistency" },
    { id: "HD1", mod: "HD", artist: "Emiru no Aishita", songName: "Devilish", skill: "Snap & spacing consistency" },
  ],
  Quarterfinals: [
    { id: "HD3", mod: "HD", artist: "Nekomata Master", songName: "Scars of FAUNA", skill: "Tech & control" },
  ],
  Semifinals: [
    { id: "NM5", mod: "NM", artist: "The Quick Brown Fox", songName: "The Big Black", skill: "Speed" },
  ],
  "Grand Finals": [
    { id: "TB", mod: "TB", artist: "icdd / xi", songName: "Embraced by the Flame", skill: "Tiebreaker" }
  ]
};

export async function GET() {
  try {
    // 1. Clear existing data to avoid duplicates if you run this multiple times
    await prisma.score.deleteMany();
    await prisma.player.deleteMany();
    await prisma.mappoolMap.deleteMany();
    await prisma.stage.deleteMany();
    await prisma.tournament.deleteMany();
    await prisma.teamPlayer.deleteMany();
    await prisma.team.deleteMany();
    await prisma.tournamentTeam.deleteMany();
    await prisma.tournamentKeeper.deleteMany();

    // 1.5 Create the first Tournament
    const tournament = await prisma.tournament.create({
      data: {
        name: "ComboKeeper Inaugural Tournament",
        format: "4v4",
        rosterSize: 8,
        isCompleted: false,
      }
    });

    // 2. Create a Team and link to Tournament
    const team = await prisma.team.create({
      data: { name: "ComboKeeper All-Stars" }
    });
    await prisma.tournamentTeam.create({
      data: {
        tournamentId: tournament.id,
        teamId: team.id,
      }
    });

    // 3. Create the Stages and Maps
    let stageSortOrder = 0;
    for (const [stageName, maps] of Object.entries(MOCK_MAPPOOL)) {
      const stage = await prisma.stage.create({
        data: {
          name: stageName,
          sortOrder: stageSortOrder++,
          tournamentId: tournament.id,
        }
      });

      for (const map of maps) {
        await prisma.mappoolMap.create({
          data: {
            mapId: map.id,
            mod: map.mod,
            artist: map.artist,
            songName: map.songName,
            skill: map.skill,
            stageId: stage.id,
          }
        });
      }
    }

    // 4. Create the Players
    for (const p of playersData) {
      await prisma.player.create({
        data: {
          id: p.id,
          username: p.username,
          avatarUrl: p.avatarUrl,
        }
      });

      // Add them to the team
      await prisma.teamPlayer.create({
        data: {
          teamId: team.id,
          playerId: p.id,
          role: "PLAYER", // We can build the UI to promote people to CAPTAIN later!
        }
      });
    }

    // 5. Create the Scores
    for (const mapScore of scoresData as any) {
      // Find the stage and map in the database
      const stage = await prisma.stage.findFirst({
        where: { name: mapScore.stage, tournamentId: tournament.id }
      });
      if (!stage) continue;

      const dbMap = await prisma.mappoolMap.findFirst({
        where: { mapId: mapScore.mapId, stageId: stage.id }
      });
      if (!dbMap) continue;

      // Insert every score recorded for that map
      for (const playerScore of mapScore.scores) {
        for (const historyItem of playerScore.history) {
          await prisma.score.create({
            data: {
              score: historyItem.score,
              accuracy: historyItem.accuracy,
              playerId: playerScore.playerId,
              mappoolMapId: dbMap.id,
            }
          });
        }
      }
    }

    return NextResponse.json({ message: 'Database seeded successfully! Your mock data is now inside SQLite.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}
