export type ModScoreHistory = {
  score: number;
  playedMod?: string | null;
};

export function isNomodPlay(playedMod: string | null | undefined): boolean {
  return !playedMod || playedMod === "NM";
}

/** Hidden only — not HR or HDHR (used for MM/FreeMod HD requirement). */
export function isHDOnlyPlay(playedMod: string | null | undefined): boolean {
  return playedMod === "HD";
}

/** Hard Rock or Hidden + Hard Rock. */
export function isHRPlay(playedMod: string | null | undefined): boolean {
  return !!playedMod && playedMod.includes("HR");
}

/** Official FreeMod choices: NM, HD, HR, HDHR. */
export function isValidFMPlay(playedMod: string | null | undefined): boolean {
  return isNomodPlay(playedMod) || isHDOnlyPlay(playedMod) || isHRPlay(playedMod);
}

export type MMSlot = "HD" | "HR" | "NM";

export function scoreMatchesMMSlot(playedMod: string | null | undefined, slot: MMSlot): boolean {
  if (isNomodPlay(playedMod)) return slot === "NM";
  if (slot === "HD") return isHDOnlyPlay(playedMod);
  if (slot === "HR") return isHRPlay(playedMod);
  return false;
}

export function getBestScoreMatching(
  history: ModScoreHistory[],
  match: (playedMod: string | null | undefined) => boolean
): number {
  const matching = history.filter((h) => match(h.playedMod));
  return matching.length > 0 ? Math.max(...matching.map((h) => h.score)) : 0;
}

export function getBestPlayMatching(
  history: ModScoreHistory[],
  match: (playedMod: string | null | undefined) => boolean
): ModScoreHistory | null {
  const matching = history.filter((h) => match(h.playedMod));
  if (matching.length === 0) return null;
  return matching.reduce((a, b) => (a.score > b.score ? a : b));
}

export function displayModFromPlay(
  play: ModScoreHistory | null,
  fallback: string
): string {
  if (!play) return fallback;
  if (play.playedMod && play.playedMod !== "NM") return play.playedMod;
  return fallback;
}
