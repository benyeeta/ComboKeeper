import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { decrypt } from "@/lib/session";

export async function verifyTournamentParticipant(tournamentId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;

  if (!currentUser) {
    return { authorized: false as const, error: "You must be logged in.", currentUser: null };
  }

  if (process.env.ADMIN_OSU_ID && currentUser.id === Number(process.env.ADMIN_OSU_ID)) {
    return { authorized: true as const, error: null, currentUser };
  }

  const tournament = await prisma.tournament.findFirst({
    where: {
      id: tournamentId,
      OR: [
        { keepers: { some: { playerId: currentUser.id } } },
        {
          teams: {
            some: { team: { players: { some: { playerId: currentUser.id, status: "ACCEPTED" } } } },
          },
        },
      ],
    },
    select: { id: true },
  });

  if (!tournament) {
    return { authorized: false as const, error: "Forbidden.", currentUser };
  }

  return { authorized: true as const, error: null, currentUser };
}
