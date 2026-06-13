import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildStageMappoolZip } from "@/lib/mappoolZip";
import { ratelimit } from "@/lib/ratelimit";
import { verifyTournamentParticipant } from "@/lib/tournamentAuth";

export const maxDuration = 300;

type RouteContext = { params: Promise<{ tournamentId: string; stageId: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { tournamentId, stageId } = await context.params;

  const auth = await verifyTournamentParticipant(tournamentId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.error === "Forbidden." ? 403 : 401 });
  }

  const { success } = await ratelimit.limit(`mappoolZip_${auth.currentUser!.id}`);
  if (!success) {
    return NextResponse.json({ error: "Too many download requests. Please wait a moment." }, { status: 429 });
  }

  const stage = await prisma.stage.findFirst({
    where: { id: stageId, tournamentId },
    select: {
      name: true,
      maps: {
        select: { mapId: true, beatmapId: true, artist: true, songName: true },
        orderBy: { mapId: "asc" },
      },
    },
  });

  if (!stage) {
    return NextResponse.json({ error: "Stage not found." }, { status: 404 });
  }

  const result = await buildStageMappoolZip(stage.name, stage.maps);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
