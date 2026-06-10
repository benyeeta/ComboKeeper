import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/** osu! docs: max 60 requests/minute; stay slightly under. */
const OSU_REQUESTS_PER_MINUTE = 55;
const OSU_MIN_INTERVAL_MS = 1100;
const OSU_MAX_RETRIES = 3;

let lastOsuRequestAt = 0;
let osuApiRatelimit: Ratelimit | null | undefined;

function getOsuApiRatelimit(): Ratelimit | null {
  if (osuApiRatelimit !== undefined) return osuApiRatelimit;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    osuApiRatelimit = null;
    return null;
  }
  osuApiRatelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(OSU_REQUESTS_PER_MINUTE, "60 s"),
    prefix: "@upstash/osu-api",
  });
  return osuApiRatelimit;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForOsuApiSlot(): Promise<void> {
  const limiter = getOsuApiRatelimit();
  if (limiter) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { success } = await limiter.limit("global");
      if (success) break;
      await sleep(2000);
    }
  }

  const elapsed = Date.now() - lastOsuRequestAt;
  if (elapsed < OSU_MIN_INTERVAL_MS) {
    await sleep(OSU_MIN_INTERVAL_MS - elapsed);
  }
  lastOsuRequestAt = Date.now();
}

/** Rate-limited fetch for all osu.ppy.sh API and OAuth endpoints. */
export async function osuApiFetch(url: string, init?: RequestInit): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < OSU_MAX_RETRIES; attempt++) {
    await waitForOsuApiSlot();

    const response = await fetch(url, init);
    if (response.status !== 429) {
      return response;
    }

    lastResponse = response;
    const retryAfterSec = Number(response.headers.get("Retry-After") || "5");
    const backoffMs = Math.min(retryAfterSec * 1000 * (attempt + 1), 60_000);
    console.warn(`[osu! API] 429 rate limited; retrying in ${backoffMs}ms`);
    await sleep(backoffMs);
  }

  return lastResponse ?? new Response(null, { status: 429, statusText: "Too Many Requests" });
}
