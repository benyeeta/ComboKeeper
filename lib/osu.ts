import { cacheLife } from "next/cache";
import { osuApiFetch } from "@/lib/osuApi";

const OSU_TOKEN_URL = "https://osu.ppy.sh/oauth/token";
const OSU_API_BASE = "https://osu.ppy.sh/api/v2";

export const MAX_ROSTER_PLAYERS = 32;
export const MAX_MAPS_PER_REQUEST = 50;

export function parseMatchId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d{1,12}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/matches\/(\d{1,12})/);
  return match ? match[1] : null;
}

export function parseBeatmapId(input: string): number | null {
  const id = Number.parseInt(input.trim(), 10);
  if (!Number.isFinite(id) || id <= 0 || id > 2_147_483_647) return null;
  return id;
}

// Cache the token request for nearly 24 hours (86000 seconds) since osu! client tokens live for 1 day.
export async function getOsuToken() {
  "use cache";
  cacheLife({ expire: 86000 });

  const OSU_CLIENT_ID = process.env.OSU_CLIENT_ID?.trim();
  const OSU_CLIENT_SECRET = process.env.OSU_CLIENT_SECRET?.trim();
  if (!OSU_CLIENT_ID || !OSU_CLIENT_SECRET) return null;

  const tokenRes = await osuApiFetch(OSU_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Number(OSU_CLIENT_ID),
      client_secret: OSU_CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "public",
    }),
  });

  if (!tokenRes.ok) {
    console.error("[osu! API] Token error:", tokenRes.status);
    return null;
  }
  return tokenRes.json();
}

// Cache the user's profile request for 1 hour so the profile page loads instantly on repeat visits
export async function getCachedOsuUser(identifier: string | number) {
  "use cache";
  cacheLife({ expire: 3600 });

  const tokenData = await getOsuToken();
  if (!tokenData?.access_token) return null;

  const keyParam = typeof identifier === "string" ? "?key=username" : "";
  const userRes = await osuApiFetch(
    `${OSU_API_BASE}/users/${encodeURIComponent(identifier)}${keyParam}`,
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
  );

  if (!userRes.ok) {
    console.error("[osu! API] User lookup error:", userRes.status);
    return null;
  }
  return userRes.json();
}

export async function resolveOsuUsers(usernames: string[]) {
  const unique = [...new Set(usernames.map((u) => u.trim()).filter(Boolean))];
  if (unique.length > MAX_ROSTER_PLAYERS) {
    return { users: new Map<string, Awaited<ReturnType<typeof getCachedOsuUser>>>(), error: `Too many players (max ${MAX_ROSTER_PLAYERS}).` };
  }

  const users = new Map<string, NonNullable<Awaited<ReturnType<typeof getCachedOsuUser>>>>();
  for (const username of unique) {
    const userData = await getCachedOsuUser(username);
    if (!userData) {
      return { users, error: `Could not find osu! user: ${username}` };
    }
    users.set(username.toLowerCase(), userData);
  }
  return { users, error: null as string | null };
}

export async function fetchBeatmapsByIds(beatmapIds: number[]) {
  const tokenData = await getOsuToken();
  if (!tokenData?.access_token) return { beatmaps: new Map<number, any>(), error: "Failed to authenticate with osu! API." };

  const uniqueIds = [...new Set(beatmapIds.filter((id) => Number.isFinite(id) && id > 0))];
  const beatmaps = new Map<number, any>();

  for (let i = 0; i < uniqueIds.length; i += 50) {
    const chunk = uniqueIds.slice(i, i + 50);
    const url = `${OSU_API_BASE}/beatmaps?${chunk.map((id) => `ids[]=${id}`).join("&")}`;
    const res = await osuApiFetch(url, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!res.ok) {
      console.error("[osu! API] Beatmap fetch error:", res.status);
      if (res.status === 429) {
        return { beatmaps, error: "osu! API rate limit reached. Please try again shortly." };
      }
      continue;
    }

    const data = await res.json();
    for (const beatmap of data.beatmaps ?? []) {
      beatmaps.set(beatmap.id, beatmap);
    }
  }

  return { beatmaps, error: null as string | null };
}

export async function getCachedMatch(matchId: string) {
  "use cache";
  cacheLife({ expire: 86400 });

  const parsed = parseMatchId(matchId);
  if (!parsed) return { data: null, error: "Invalid match ID." };

  const tokenData = await getOsuToken();
  if (!tokenData?.access_token) return { data: null, error: "Failed to authenticate with osu! API." };

  const res = await osuApiFetch(`${OSU_API_BASE}/matches/${parsed}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!res.ok) {
    if (res.status === 429) return { data: null, error: "osu! API rate limit reached. Please try again shortly." };
    if (res.status === 404) return { data: null, error: `Match ${parsed} not found.` };
    return { data: null, error: `Could not fetch match ${parsed} from osu!.` };
  }

  return { data: await res.json(), error: null as string | null };
}

export async function fetchMatchById(matchId: string) {
  return getCachedMatch(matchId);
}
