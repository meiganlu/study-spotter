// How many ratings a place needs before its own rating is fully trusted
// Fewer than this and it's pulled toward the average of the results
const RATING_CONFIDENCE = 20;

// Weighted ratings: ratings backed by only a few reviews are pulled toward the average
// (e.g. with a 4.7 average, a 5.0 from 3 ratings counts as about 4.74)
// Shared by the server's scoring and the client's fallback sort
export function weightedRatings(spots: { rating?: number; ratingCount?: number }[]): number[] {
  const rated = spots.filter(s => s.rating !== undefined);
  const average = rated.length > 0
    ? rated.reduce((sum, s) => sum + (s.rating ?? 0), 0) / rated.length
    : 0;

  return spots.map(spot => {
    const count = spot.ratingCount ?? 0;
    const rating = spot.rating ?? average;
    return (count * rating + RATING_CONFIDENCE * average) / (count + RATING_CONFIDENCE);
  });
}
