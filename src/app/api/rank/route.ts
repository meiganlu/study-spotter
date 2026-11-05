import { NextRequest, NextResponse } from "next/server";
import { getAnchors } from "@/lib/ranking/server/anchors";
import { LruCache } from "@/lib/ranking/server/cache";
import { getEmbeddings } from "@/lib/ranking/server/embeddings";
import { parseQuery } from "@/lib/ranking/server/query";
import { isRateLimited } from "@/lib/ranking/server/rateLimit";
import { buildPlaceText, scoreSpots, studyScore, type RankSpot } from "@/lib/ranking/server/score";
import { parseRankRequest } from "@/lib/ranking/server/validate";

const ONE_HOUR = 60 * 60 * 1000;

// Each place's embedding (~6 KB) and study score (one number), kept for an hour
const placeEmbeddingCache = new LruCache<Float32Array>(2000, ONE_HOUR);
const studyScoreCache = new LruCache<number>(5000, ONE_HOUR);

// Scores each spot by how well it fits the query and how good it is for studying
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = parseRankRequest(await req.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { spots } = parsed;

  // e.g. "cafe with outlets" → category "Café/Coffee Shop", needs "outlets"
  const query = parseQuery(parsed.query);

  try {
    const anchors = await getAnchors();

    // Use cached values where we have them, and note what still needs embedding
    const placeEmbeddings = new Map<string, Float32Array>();
    const studyScores = new Map<string, number>();
    const uncachedPlaces: RankSpot[] = [];
    const unscoredPlaces: RankSpot[] = [];

    spots.forEach(spot => {
      const embedding = placeEmbeddingCache.get(spot.id);
      if (embedding) placeEmbeddings.set(spot.id, embedding);
      else uncachedPlaces.push(spot);

      const score = studyScoreCache.get(spot.id);
      if (score !== undefined) studyScores.set(spot.id, score);
      else if (spot.reviews?.length) unscoredPlaces.push(spot);
    });

    // One batch: the user's needs, then new place descriptions,
    // then every review of places without a study score
    const vectors = await getEmbeddings([
      query.needs,
      ...uncachedPlaces.map(buildPlaceText),
      ...unscoredPlaces.flatMap(spot => spot.reviews ?? []),
    ]);

    // Read the results back in the same order they were sent
    let next = 0;
    const needsEmbedding = vectors[next++];

    uncachedPlaces.forEach(spot => {
      const embedding = vectors[next++];
      placeEmbeddings.set(spot.id, embedding);
      placeEmbeddingCache.set(spot.id, embedding);
    });

    // Review embeddings are only needed long enough to compute the study score
    unscoredPlaces.forEach(spot => {
      const reviewEmbeddings = (spot.reviews ?? []).map(() => vectors[next++]);
      const score = studyScore(reviewEmbeddings, anchors);
      studyScores.set(spot.id, score);
      studyScoreCache.set(spot.id, score);
    });

    return NextResponse.json({
      scores: scoreSpots(query, needsEmbedding, spots, placeEmbeddings, studyScores),
    });
  } catch (err) {
    console.error("Ranking error:", err);
    // Client falls back to sorting by rating when this fails
    return NextResponse.json({ error: "Ranking failed" }, { status: 502 });
  }
}
