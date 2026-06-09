const IGNORED_MODS = new Set(["NF"]);

/** Strip mods everyone always plays with (e.g. NF in tournaments). */
export function normalizePlayedMod(playedMod: string | null | undefined): string {
  if (!playedMod) return "NM";
  let result = playedMod;
  for (const ignored of IGNORED_MODS) {
    result = result.replaceAll(ignored, "");
  }
  return result || "NM";
}

/** Parse osu! mod bitmask (scores.db format) into a playedMod string. */
export function parseModsBitmask(mods: number): string {
  if (mods <= 0) return "NM";

  const modAcronyms: string[] = [];
  // NF (bit 1) is intentionally omitted — always on in tournament play
  if (mods & 2) modAcronyms.push("EZ");
  if (mods & 8) modAcronyms.push("HD");
  if (mods & 16) modAcronyms.push("HR");
  if (mods & 64 && !(mods & 512)) modAcronyms.push("DT");
  if (mods & 512) modAcronyms.push("NC");
  if (mods & 1024) modAcronyms.push("FL");
  if (mods & 256) modAcronyms.push("HT");

  return normalizePlayedMod(modAcronyms.length > 0 ? modAcronyms.join("") : "NM");
}

/** Parse mods from osu! API v2 (bitmask, string[], or Mod objects with acronym). */
export function parsePlayedModFromApi(mods: unknown): string {
  if (mods == null) return "NM";
  if (typeof mods === "number") return parseModsBitmask(mods);

  if (Array.isArray(mods)) {
    if (mods.length === 0) return "NM";
    const acronyms = mods
      .map((m) => {
        if (typeof m === "string") return m;
        if (m && typeof m === "object" && "acronym" in m) return String((m as { acronym: string }).acronym);
        return "";
      })
      .filter((a) => a && !IGNORED_MODS.has(a));
    return normalizePlayedMod(acronyms.length > 0 ? acronyms.join("") : "NM");
  }

  return "NM";
}

/** Whether a stored playedMod counts toward an MM lineup slot (NM, HD-only, or HR). */
export function scoreMatchesModSlot(playedMod: string | null | undefined, slot: "NM" | "HD" | "HR"): boolean {
  const mod = normalizePlayedMod(playedMod);
  if (slot === "NM") return mod === "NM";
  if (slot === "HR") return mod.includes("HR");
  // HD slot: Hidden without HardRock (HR implicitly includes HD)
  if (slot === "HD") return mod.includes("HD") && !mod.includes("HR");
  return false;
}
