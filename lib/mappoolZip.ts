import { ZipArchive } from "archiver";
import { PassThrough, Readable } from "node:stream";
import { fetchBeatmapsByIds } from "@/lib/osu";

const OSU_BEATMAPSET_DOWNLOAD = "https://osu.ppy.sh/beatmapsets";
const DOWNLOAD_INTERVAL_MS = 1500;

export type StageMapForZip = {
  mapId: string;
  beatmapId: number | null;
  artist: string;
  songName: string;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 180) || "beatmap";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadBeatmapset(beatmapsetId: number): Promise<Buffer | null> {
  const url = `${OSU_BEATMAPSET_DOWNLOAD}/${beatmapsetId}/download?noVideo=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "combokeeper/0.1 (tournament mappool zip)" },
    redirect: "follow",
  });
  if (!res.ok) {
    console.warn(`[mappool zip] beatmapset ${beatmapsetId} download failed: ${res.status}`);
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function buildStageMappoolZip(stageName: string, maps: StageMapForZip[]) {
  const mapsWithIds = maps.filter((m) => m.beatmapId != null && m.beatmapId > 0);
  if (mapsWithIds.length === 0) {
    return { error: "No maps in this stage have a beatmap ID.", status: 400 as const };
  }

  const { beatmaps, error: beatmapError } = await fetchBeatmapsByIds(mapsWithIds.map((m) => m.beatmapId!));
  if (beatmapError) return { error: beatmapError, status: 502 as const };
  if (beatmaps.size === 0) {
    return { error: "Could not resolve beatmap metadata from osu!.", status: 502 as const };
  }

  const beatmapsetEntries = new Map<number, { mapId: string; artist: string; songName: string }>();
  for (const map of mapsWithIds) {
    const bm = beatmaps.get(map.beatmapId!);
    if (!bm?.beatmapset_id) continue;
    if (!beatmapsetEntries.has(bm.beatmapset_id)) {
      beatmapsetEntries.set(bm.beatmapset_id, {
        mapId: map.mapId,
        artist: map.artist,
        songName: map.songName,
      });
    }
  }

  if (beatmapsetEntries.size === 0) {
    return { error: "No downloadable beatmapsets found for this stage.", status: 400 as const };
  }

  const passThrough = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 5 } });
  archive.on("error", (err) => passThrough.destroy(err));
  archive.pipe(passThrough);

  const zipFilename = `${sanitizeFilename(stageName)}_mappool.zip`;

  void (async () => {
    const failed: string[] = [];
    let successCount = 0;
    let isFirst = true;

    try {
      for (const [beatmapsetId, meta] of beatmapsetEntries) {
        if (!isFirst) await sleep(DOWNLOAD_INTERVAL_MS);
        isFirst = false;

        const buffer = await downloadBeatmapset(beatmapsetId);
        if (!buffer) {
          failed.push(`${meta.mapId} (beatmapset ${beatmapsetId})`);
          continue;
        }

        const entryName = `${meta.mapId}_${sanitizeFilename(meta.artist)} - ${sanitizeFilename(meta.songName)}.osz`;
        archive.append(buffer, { name: entryName });
        successCount++;
      }

      if (failed.length > 0) {
        archive.append(`The following beatmapsets could not be downloaded:\n\n${failed.join("\n")}\n`, {
          name: "_FAILED_DOWNLOADS.txt",
        });
      }

      if (successCount === 0) {
        passThrough.destroy(new Error("All beatmapset downloads failed."));
        return;
      }

      await archive.finalize();
    } catch (err) {
      passThrough.destroy(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return {
    stream: Readable.toWeb(passThrough) as ReadableStream,
    filename: zipFilename,
  };
}
