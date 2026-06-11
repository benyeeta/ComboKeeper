import { revalidatePath, updateTag } from "next/cache";

/** Invalidate dashboard/team views and tournament data cache after mutations. */
export function revalidateTournamentViews(userId?: number, tournamentId?: string) {
  revalidatePath("/");
  revalidatePath("/team");
  updateTag("tournament-data");
  updateTag("stage-scores");
  if (userId != null) {
    updateTag(`tournament-data-${userId}`);
    updateTag(`tournament-data-${userId}-${tournamentId || "active"}`);
    updateTag(`stage-scores-${userId}`);
    if (tournamentId) {
      updateTag(`stage-scores-${userId}-${tournamentId}`);
    }
  }
}
