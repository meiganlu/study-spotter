import type { StudySpot } from "@/types";
import { weightedRatings } from "./rating";

// Sends spots to /api/rank and sorts them by how well they match the query
export async function rankSpots(spots: StudySpot[], query: string): Promise<StudySpot[]> {
  try {
    // Only send the fields the ranking uses
    const payload = spots.map(s => ({
      id: s.id,
      name: s.name,
      types: s.types,
      reviews: s.reviews,
      rating: s.rating,
      ratingCount: s.ratingCount,
    }));

    const res = await fetch("/api/rank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, spots: payload }),
    });

    if (!res.ok) throw new Error(`Ranking failed: ${res.status}`);
    const { scores } = await res.json();

    // Highest score first
    return [...spots].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  } catch (err) {
    console.warn("Semantic ranking unavailable, sorting by rating instead:", err);
    // If ranking fails, fall back to rating sort — app still works
    // Uses weighted ratings, so a 5.0 from 3 ratings doesn't jump to the top
    const ratings = weightedRatings(spots);
    return spots
      .map((spot, i) => ({ spot, rating: ratings[i] }))
      .sort((a, b) => b.rating - a.rating)
      .map(({ spot }) => spot);
  }
}
