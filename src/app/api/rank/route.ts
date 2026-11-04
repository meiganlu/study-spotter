import { NextRequest, NextResponse } from "next/server";

// Cache of place embeddings by place ID, so each place is only embedded once
// Stored in memory, so it resets when the server restarts
const embeddingCache = new Map<string, number[]>();

// Max texts sent in one embeddings request
const EMBED_BATCH_SIZE = 100;

// Gets embeddings for many texts at once, not just one request per text
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let start = 0; start < texts.length; start += EMBED_BATCH_SIZE) {
    const batch = texts.slice(start, start + EMBED_BATCH_SIZE);

    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: batch,
      }),
    });

    if (!res.ok) {
      throw new Error(`Embeddings request failed: ${res.status} ${await res.text()}`);
    }

    const data: { data: { index: number; embedding: number[] }[] } = await res.json();

    // Sort by index so each embedding lines up with the text it came from
    data.data
      .sort((a, b) => a.index - b.index)
      .forEach(item => embeddings.push(item.embedding));
  }

  return embeddings;
}

// How similar two embeddings are, from -1 to 1 (higher = closer in meaning)
// Compares direction only, so longer text doesn't score higher just for being longer
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

interface RankSpot {
  id: string;
  name: string;
  types?: string[];
  reviewMentions?: string[];
  reviewText?: string;
  rating?: number;
}

// Builds the text that describes a place for its embedding
function buildPlaceText(spot: RankSpot): string {
  const parts = [
    spot.name,
    spot.types?.join(" ") ?? "",
    spot.reviewMentions && spot.reviewMentions.length > 0
      ? spot.reviewMentions.join(", ")
      : "study location",
    spot.rating ? `rated ${spot.rating} out of 5` : "",
    // Review text
    spot.reviewText ? `Reviews: ${spot.reviewText.slice(0, 2000)}` : "",
  ];
  const text = parts.filter(Boolean).join(". ");
  return text.trim() || spot.name;
}

// Scores each spot by how well it matches the query
export async function POST(req: NextRequest) {
  const { query, spots } = await req.json();

  if (!query || !spots || !Array.isArray(spots)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rankSpots = spots as RankSpot[];

  try {
    // Embed the query and any places not cached yet in one batch
    const uncached = rankSpots.filter(spot => !embeddingCache.has(spot.id));
    const [queryEmbedding, ...placeEmbeddings] = await getEmbeddings([
      query,
      ...uncached.map(buildPlaceText),
    ]);
    uncached.forEach((spot, i) => embeddingCache.set(spot.id, placeEmbeddings[i]));

    const scoreMap: Record<string, number> = {};
    rankSpots.forEach(spot => {
      const placeEmbedding = embeddingCache.get(spot.id)!;
      const similarity = cosineSimilarity(queryEmbedding, placeEmbedding);
      const ratingScore = (spot.rating ?? 0) / 5;

      // 70% semantic match, 30% rating
      scoreMap[spot.id] = similarity * 0.7 + ratingScore * 0.3;
    });

    return NextResponse.json({ scores: scoreMap });
  } catch (err) {
    console.error("Ranking error:", err);
    // Client falls back to sorting by rating when this fails
    return NextResponse.json({ error: "Ranking failed" }, { status: 502 });
  }
}
