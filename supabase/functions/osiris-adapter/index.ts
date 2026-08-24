import { mapOsirisFeeds } from "./mapper.ts";

const DEFAULT_UPSTREAM = "https://osirisai.live/api";
const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 8_000;

type Snapshot = ReturnType<typeof mapOsirisFeeds> & {
  synchronizedAt: string;
  sources: Record<string, "connected" | "unavailable">;
};

let cached: { expiresAt: number; value: Snapshot } | null = null;
let inFlight: Promise<Snapshot> | null = null;

const allowedOrigins = () =>
  (Deno.env.get("OSIRIS_ADAPTER_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsHeaders = (request: Request) => {
  const origin = request.headers.get("origin");
  const allowed = allowedOrigins();
  const selected =
    origin && allowed.includes(origin) ? origin : (allowed[0] ?? "null");
  return {
    "Access-Control-Allow-Origin": selected,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    Vary: "Origin",
  };
};

const json = (request: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json",
      "Cache-Control":
        "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
    },
  });

const authorized = (request: Request) => {
  const expected = Deno.env.get("OSIRIS_ADAPTER_PUBLIC_TOKEN")?.trim();
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
};

async function fetchFeed(baseUrl: string, name: string) {
  const response = await fetch(`${baseUrl}/${name}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AIJE-Osiris-Adapter/1.0",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${name} returned ${response.status}`);
  return await response.json();
}

async function createSnapshot(): Promise<Snapshot> {
  const baseUrl = (
    Deno.env.get("OSIRIS_UPSTREAM_BASE_URL") ?? DEFAULT_UPSTREAM
  ).replace(/\/+$/, "");
  const names = ["conflicts", "gdelt", "country-risk"] as const;
  const results = await Promise.allSettled(
    names.map((name) => fetchFeed(baseUrl, name)),
  );
  const feeds: Record<string, unknown> = {};
  const sources: Snapshot["sources"] = {};
  names.forEach((name, index) => {
    const result = results[index];
    sources[name] = result.status === "fulfilled" ? "connected" : "unavailable";
    if (result.status === "fulfilled") feeds[name] = result.value;
    else
      console.error("[osiris-adapter] upstream unavailable", {
        source: name,
        error: String(result.reason),
      });
  });
  if (results.every((result) => result.status === "rejected")) {
    throw new Error("All OSIRIS upstream feeds are unavailable");
  }
  const synchronizedAt = new Date().toISOString();
  return {
    ...mapOsirisFeeds({
      conflicts: feeds.conflicts,
      gdelt: feeds.gdelt,
      countryRisk: feeds["country-risk"],
      now: synchronizedAt,
    }),
    synchronizedAt,
    sources,
  };
}

async function getSnapshot() {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (!inFlight) {
    inFlight = createSnapshot()
      .then((value) => {
        cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
        return value;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return await inFlight;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders(request) });
  if (request.method !== "GET")
    return json(request, { error: "Method not allowed" }, 405);
  if (!authorized(request))
    return json(request, { error: "Unauthorized" }, 401);

  const route = new URL(request.url).pathname.split("/").filter(Boolean).at(-1);
  try {
    const snapshot = await getSnapshot();
    if (route === "threat-assessments")
      return json(request, snapshot.assessments);
    if (route === "hotspots") return json(request, snapshot.hotspots);
    if (route === "health") {
      return json(request, {
        status: Object.values(snapshot.sources).includes("unavailable")
          ? "degraded"
          : "operational",
        synchronizedAt: snapshot.synchronizedAt,
        sources: snapshot.sources,
        assessmentCount: snapshot.assessments.length,
        hotspotCount: snapshot.hotspots.length,
      });
    }
    return json(request, { error: "Not found" }, 404);
  } catch (error) {
    console.error("[osiris-adapter] request failed", { error: String(error) });
    return json(request, { error: "OSIRIS upstream unavailable" }, 503);
  }
});
