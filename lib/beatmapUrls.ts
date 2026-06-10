import type { MappoolMap } from "@/lib/types";

export function beatmapUrl(beatmapId: number | string | null | undefined): string | null {
  if (beatmapId == null || beatmapId === "") return null;
  const id = typeof beatmapId === "string" ? parseInt(beatmapId, 10) : beatmapId;
  if (!Number.isFinite(id) || id <= 0) return null;
  return `https://osu.ppy.sh/b/${id}`;
}

export function getBeatmapIdFromPool(
  mappool: Record<string, MappoolMap[]> | undefined,
  stage: string,
  mapId: string
): number | null {
  const map = mappool?.[stage]?.find((m) => m.id === mapId);
  return map?.beatmapId ?? null;
}
