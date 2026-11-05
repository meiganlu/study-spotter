import type { RankSpot } from "./score";

// Limits on what /api/rank accepts, so nobody can send huge requests and run up the OpenAI bill
const MAX_QUERY_CHARS = 300;
const MAX_SPOTS = 150; // A search returns at most ~100 places
const MAX_REVIEWS_PER_SPOT = 5; // Google returns at most 5
const MAX_REVIEW_CHARS = 1000;

const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// Checks the request body and trims it to safe sizes; returns null if it's not usable
export function parseRankRequest(body: unknown): { query: string; spots: RankSpot[] } | null {
  if (!body || typeof body !== "object") return null;
  const { query, spots } = body as { query?: unknown; spots?: unknown };

  if (!isString(query) || !query.trim()) return null;
  if (!Array.isArray(spots) || spots.length > MAX_SPOTS) return null;

  const cleanSpots: RankSpot[] = [];
  for (const raw of spots) {
    if (!raw || typeof raw !== "object") return null;
    const s = raw as Record<string, unknown>;
    if (!isString(s.id) || !isString(s.name)) return null;

    cleanSpots.push({
      id: s.id,
      name: s.name.slice(0, 200),
      types: Array.isArray(s.types) ? s.types.filter(isString).slice(0, 20) : undefined,
      reviews: Array.isArray(s.reviews)
        ? s.reviews
            .filter((r): r is string => isString(r) && r.trim() !== "") // Empty texts can't be embedded
            .slice(0, MAX_REVIEWS_PER_SPOT)
            .map(r => r.slice(0, MAX_REVIEW_CHARS))
        : undefined,
      rating: isNumber(s.rating) ? Math.min(Math.max(s.rating, 0), 5) : undefined,
      ratingCount: isNumber(s.ratingCount) ? Math.max(s.ratingCount, 0) : undefined,
    });
  }

  return { query: query.trim().slice(0, MAX_QUERY_CHARS), spots: cleanSpots };
}
