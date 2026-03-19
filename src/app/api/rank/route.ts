import { NextRequest, NextResponse } from "next/server";

const embeddingCache = new Map<string, number[]>();

async function getEmbedding(text: string): Promise<number[]> {
  // API key is read server-side
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  const data = await res.json();
  return data.data[0].embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

function buildPlaceText(spot: {
  name: string;
  types?: string[];
  reviewMentions?: string[];
  rating?: number;
}): string {
  const parts = [
    spot.name,
    spot.types?.join(" ") ?? "",
    spot.reviewMentions && spot.reviewMentions.length > 0
      ? spot.reviewMentions.join(", ")
      : "study location",
    spot.rating ? `rated ${spot.rating} out of 5` : "",
  ];
	const text = parts.filter(Boolean).join(". ");
  return text.trim() || spot.name;
}

export async function POST(req: NextRequest) {
  const { query, spots } = await req.json();

  if (!query || !spots || !Array.isArray(spots)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const queryEmbedding = await getEmbedding(query);

  const scored = await Promise.all(
    spots.map(async (spot: {
      id: string;
      name: string;
      types?: string[];
      reviewMentions?: string[];
      rating?: number;
    }) => {
      let placeEmbedding = embeddingCache.get(spot.id);

      if (!placeEmbedding) {
        const text = buildPlaceText(spot);
        placeEmbedding = await getEmbedding(text);
        embeddingCache.set(spot.id, placeEmbedding);
      }

      const similarity = cosineSimilarity(queryEmbedding, placeEmbedding);
      const ratingScore = (spot.rating ?? 0) / 5;

      const finalScore = similarity * 0.7 + ratingScore * 0.3;

      return { id: spot.id, score: finalScore };
    })
  );

  const scoreMap: Record<string, number> = {};
  scored.forEach(({ id, score }) => {
    scoreMap[id] = score;
  });

  return NextResponse.json({ scores: scoreMap });
}