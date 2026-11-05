import { getCategory } from "../../categories";
import { findFeatures } from "../../tags";
import { weightedRatings } from "../rating";
import type { Anchors } from "./anchors";
import type { ParsedQuery } from "./query";

// How much each signal counts toward the final score
const MATCH_WEIGHT = 0.7; // How well the place fits what the user needs
const STUDY_WEIGHT = 0.2; // How good reviewers say it is for studying
const RATING_WEIGHT = 0.1; // Google rating, mostly a tie-breaker

// Within the match: meaning vs. features the user named exactly (e.g. "outlets")
const SEMANTIC_SHARE = 0.7;
const KEYWORD_SHARE = 0.3;

// Added when a place is the kind the user asked for (e.g. "cafe")
// The other signals add up to at most 1, so named places always come first (best fit first),
// and everything else still shows below them, like a soft filter
const CATEGORY_BONUS = 1;

// Max characters of review text in a place's description
const MAX_REVIEW_CHARS = 2000;

export interface RankSpot {
  id: string;
  name: string;
  primaryType?: string;
  types?: string[];
  reviews?: string[];
  rating?: number;
  ratingCount?: number;
}

// Builds the text that describes what a place is like, for matching against the user's needs
// No place types: the kind of place is matched separately, so coffee-heavy cafés don't win
// just for sounding the most like a café
export function buildPlaceText(spot: RankSpot): string {
  const reviewText = (spot.reviews ?? []).join(" ").slice(0, MAX_REVIEW_CHARS);
  return reviewText ? `${spot.name}. Reviews: ${reviewText}` : spot.name;
}

// How similar two embeddings are (higher = closer in meaning)
// OpenAI embeddings are already length 1, so cosine similarity is just the dot product
function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

// A place's study score from its individual reviews
// Each review: how much closer it is to the "good" anchor than the "bad" one
// Average of the top 2, so one great review isn't drowned out by reviews about coffee,
// and one odd review can't decide it alone
export function studyScore(reviewEmbeddings: Float32Array[], anchors: Anchors): number {
  const perReview = reviewEmbeddings
    .map(r => dot(r, anchors.good) - dot(r, anchors.bad))
    .sort((a, b) => b - a)
    .slice(0, 2);
  return perReview.reduce((sum, s) => sum + s, 0) / perReview.length;
}

// Rescales values to 0–1 within this set of results, so small differences still count
function minMaxNormalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map(v => (v - min) / (max - min));
}

// Share of the features the user asked for that a place's reviews mention (0 to 1)
function keywordMatch(spot: RankSpot, features: string[]): number {
  const mentioned = new Set(findFeatures((spot.reviews ?? []).join(" ")));
  return features.filter(f => mentioned.has(f)).length / features.length;
}

// Scores each spot: 70% fit to the user's needs + 20% study score + 10% rating,
// with places of the kind they asked for placed first
export function scoreSpots(
  query: ParsedQuery,
  needsEmbedding: Float32Array,
  spots: RankSpot[],
  placeEmbeddings: Map<string, Float32Array>,
  studyScores: Map<string, number>
): Record<string, number> {
  if (spots.length === 0) return {};

  // Fit to the user's needs: meaning, plus exact features when they named any
  const semantic = minMaxNormalize(spots.map(spot => dot(needsEmbedding, placeEmbeddings.get(spot.id)!)));
  const match = query.features.length > 0
    ? spots.map((spot, i) => SEMANTIC_SHARE * semantic[i] + KEYWORD_SHARE * keywordMatch(spot, query.features))
    : semantic;

  // Places with no reviews get the average study score, since there's no evidence either way
  const known = spots.map(s => studyScores.get(s.id)).filter((s): s is number => s !== undefined);
  const averageStudy = known.length > 0 ? known.reduce((sum, s) => sum + s, 0) / known.length : 0;
  const study = minMaxNormalize(spots.map(s => studyScores.get(s.id) ?? averageStudy));

  const rating = minMaxNormalize(weightedRatings(spots));

  const scores: Record<string, number> = {};
  spots.forEach((spot, i) => {
    const categoryBonus = query.category && getCategory(spot) === query.category ? CATEGORY_BONUS : 0;
    scores[spot.id] = MATCH_WEIGHT * match[i] + STUDY_WEIGHT * study[i] + RATING_WEIGHT * rating[i] + categoryBonus;
  });
  return scores;
}
