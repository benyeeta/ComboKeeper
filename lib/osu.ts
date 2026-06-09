import { cacheLife } from "next/cache";

const TRACKED_MODS = ["HD", "HR"] as const;

/** Extract only HD/HR from osu! mod data (API array or .db bitmask). Returns "NM" if neither applies. */
export function parseTrackedPlayedMod(mods: unknown): string {
  const acronyms = new Set<string>();

  if (Array.isArray(mods)) {
    for (const mod of mods) {
      const acronym = typeof mod === "string" ? mod : (mod as { acronym?: string })?.acronym;
      if (acronym && (TRACKED_MODS as readonly string[]).includes(acronym)) {
        acronyms.add(acronym);
      }
    }
  } else if (typeof mods === "number" && mods > 0) {
    if (mods & 8) acronyms.add("HD");
    if (mods & 16) acronyms.add("HR");
  }

  if (acronyms.size === 0) return "NM";
  return TRACKED_MODS.filter((m) => acronyms.has(m)).join("");
}

// Cache the token request for nearly 24 hours (86000 seconds) since osu! client tokens live for 1 day.
export async function getOsuToken() {
  "use cache";
  cacheLife({ expire: 86000 });

  const OSU_CLIENT_ID = process.env.OSU_CLIENT_ID?.trim();
  const OSU_CLIENT_SECRET = process.env.OSU_CLIENT_SECRET?.trim();
  if (!OSU_CLIENT_ID || !OSU_CLIENT_SECRET) return null;

  const tokenRes = await fetch("https://osu.ppy.sh/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      client_id: Number(OSU_CLIENT_ID), 
      client_secret: OSU_CLIENT_SECRET, 
      grant_type: "client_credentials", 
      scope: "public" 
    }),
  });
  
  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    console.error("[osu! API] Token Error:", tokenRes.status, errorText);
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
  const userRes = await fetch(`https://osu.ppy.sh/api/v2/users/${encodeURIComponent(identifier)}${keyParam}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  
  if (!userRes.ok) {
    const errorText = await userRes.text();
    console.error(`[osu! API] User Error (${identifier}):`, userRes.status, errorText);
    return null;
  }
  return userRes.json();
}