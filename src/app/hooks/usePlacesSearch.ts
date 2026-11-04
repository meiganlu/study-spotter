"use client";

import { Loader } from "@googlemaps/js-api-loader";
import type { StudySpot } from "../types";

// Loads the Google Maps JS API with the Places library
const loader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  version: "weekly",
  libraries: ["places"],
});

// Study-related features to search for in reviews
// Each tag maps to the words that count toward it (e.g. "plugs" counts as "outlets")
const STUDY_KEYWORDS: Record<string, string[]> = {
  "wifi": ["wifi", "wi-fi", "wi fi", "internet"],
  "outlets": ["outlets", "outlet", "plugs", "plug", "power outlets", "charging"],
  "quiet": ["quiet", "peaceful", "calm"],
  "co working space": ["co-working", "coworking", "co working"],
  "comfortable": ["comfortable", "comfy"],
  "spacious": ["spacious", "roomy"],
  "cozy": ["cozy", "cosy"],
  "study": ["study", "studying"],
  "work": ["work", "working", "laptop", "laptops"],
  "reading": ["reading"],
  "seating": ["seating", "seats", "tables"],
  "friendly staff": ["friendly staff"],
  "bright": ["bright"],
  "natural light": ["natural light", "sunlight"],
};

// Escapes special regex characters so phrases match exactly
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Max characters of review text to embed per place
const MAX_REVIEW_CHARS = 2000;

export async function ensureMapsLoaded(): Promise<void> {
  await loader.load();
}

// Turns a city or zip into a location (coordinates, city, state)
export async function geocodeAddress(address: string): Promise<google.maps.GeocoderResult[] | undefined> {
  await ensureMapsLoaded();
  const geocoder = new google.maps.Geocoder();
  const res = await geocoder.geocode({ address });
  return res.results;
}

// Finds the top 3 study features mentioned in a place's reviews
function extractKeyTerms(reviews?: google.maps.places.PlaceReview[]): string[] {
  if (!reviews || reviews.length === 0) return [];

  // Count number of keyword occurrences across all reviews
  const keywordCounts = new Map<string, number>();

  reviews.forEach(review => {
    const text = review.text?.toLowerCase() || "";

    Object.entries(STUDY_KEYWORDS).forEach(([label, phrasings]) => {
      // Match any of the tag's words as whole words
      const pattern = phrasings.map(escapeRegex).join("|");
      const regex = new RegExp(`\\b(?:${pattern})\\b`, "gi");
      const matches = text.match(regex);
      if (matches) {
        keywordCounts.set(label, (keywordCounts.get(label) || 0) + matches.length);
      }
    });
  });

  // Sort by count and return top 3 keywords
  return Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([keyword]) => keyword);
}

// Reuse one Places service for all details lookups
// A plain div works here, so no hidden map is needed per place
let detailsService: google.maps.places.PlacesService | null = null;
function getDetailsService(): google.maps.places.PlacesService {
  if (!detailsService) {
    detailsService = new google.maps.places.PlacesService(document.createElement("div"));
  }
  return detailsService;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Requests a place's details (reviews, photos, etc.) and returns the status too
function requestDetails(
  placeId: string
): Promise<{ result: google.maps.places.PlaceResult | null; status: google.maps.places.PlacesServiceStatus }> {
  return new Promise((resolve) => {
    getDetailsService().getDetails(
      {
        placeId,
        fields: [
          "reviews",
          "name",
          "rating",
          "place_id",
          "photos",
          "types",
          "vicinity",
          "formatted_address",
        ],
      },
      (result, status) => resolve({ result, status })
    );
  });
}

export async function getPlaceDetails(
  placeId: string,
  attempts = 3
): Promise<google.maps.places.PlaceResult | null> {
  await ensureMapsLoaded();

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const { result, status } = await requestDetails(placeId);
    if (status === google.maps.places.PlacesServiceStatus.OK && result) return result;

    // Retry only if Google is rate limiting — otherwise log the failure and move on
    if (status !== google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
      console.warn(`Place details failed for ${placeId}: ${status}`);
      return null;
    }
    await sleep(500 * attempt);
  }

  console.warn(`Place details rate-limited for ${placeId} after ${attempts} attempts`);
  return null;
}

// Runs a task on each item with at most `limit` running at the same time
async function runWithLimit<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  // Each worker keeps taking the next item until none are left
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await task(item);
    }
  });
  await Promise.all(workers);
}

// Number of details requests running at once
const DETAILS_CONCURRENCY = 6;

// Converts Google results into study spots and adds their reviews and photos
async function placesToStudySpots(places: google.maps.places.PlaceResult[]): Promise<StudySpot[]> {
  // Keyed by place ID, so places found by more than one search only appear once
  const map = new Map<string, StudySpot>();

  places.forEach(place => {
    if (!place.place_id || !place.name || !place.geometry?.location) return;
    map.set(place.place_id, {
      id: place.place_id,
      name: place.name!,
      vicinity: place.formatted_address || place.vicinity || "",
      rating: place.rating,
      geometry: { location: place.geometry!.location! },
      types: place.types,
      reviewMentions: [],
      photoUrl: undefined,
    });
  });

  // Fetch details for each place (reviews and photos)
  // Limited to a few at a time so Google doesn't throttle the requests
  await runWithLimit(Array.from(map.keys()), DETAILS_CONCURRENCY, async (placeId) => {
    const details = await getPlaceDetails(placeId);
    const spot = map.get(placeId);
    if (!spot) return;

    // Extract key terms from reviews
    if (details?.reviews) {
      spot.reviewMentions = extractKeyTerms(details.reviews);
      // Save the review text for ranking, so needs beyond the top 3 tags still count
      spot.reviewText = details.reviews
        .map(r => r.text || "")
        .join(" ")
        .slice(0, MAX_REVIEW_CHARS);
    }

    // Get photo URL
    if (details?.photos && details.photos.length > 0) {
      spot.photoUrl = details.photos[0].getUrl({ maxWidth: 800, maxHeight: 600 });
    }
  });

  return Array.from(map.values());
}

// Sends spots to /api/rank and sorts them by how well they match the query
async function rankSpots(spots: StudySpot[], query: string): Promise<StudySpot[]> {
  try {
    // Only send the fields the ranking uses
    const payload = spots.map(s => ({
      id: s.id,
      name: s.name,
      types: s.types,
      reviewMentions: s.reviewMentions,
      reviewText: s.reviewText,
      rating: s.rating,
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
    // If ranking fails, fall back to rating sort
    return [...spots].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }
}

// Max distance from the searched location (meters)
const SEARCH_RADIUS_M = 8000;

// Distance between two points in meters (haversine formula)
function distanceMeters(a: google.maps.LatLng, b: google.maps.LatLng): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat() - a.lat());
  const dLng = toRad(b.lng() - a.lng());
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat())) * Math.cos(toRad(b.lat())) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Runs each Google search, keeps nearby results, then ranks them by the user's intent
export async function textSearchMultiple(
  queries: string[],
  intent?: string,
  center?: google.maps.LatLng
): Promise<StudySpot[]> {
  await ensureMapsLoaded();

  // Places text search needs a map, so create a hidden one
  const offscreen = document.createElement("div");
  offscreen.style.width = "0";
  offscreen.style.height = "0";
  offscreen.style.position = "absolute";
  offscreen.style.left = "-9999px";
  document.body.appendChild(offscreen);

  const map = new google.maps.Map(offscreen);
  const service = new google.maps.places.PlacesService(map);

  // Run all searches at the same time
  const promises = queries.map(q => new Promise<google.maps.places.PlaceResult[]>(resolve => {
    // Bias results toward the searched location
    const request: google.maps.places.TextSearchRequest = center
      ? { query: q, location: center, radius: SEARCH_RADIUS_M }
      : { query: q };
    service.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) resolve(results);
      else resolve([]);
    });
  }));

  let all = (await Promise.all(promises)).flat();
  offscreen.remove();

  // Location is only a bias, so remove results that are too far away
  if (center) {
    all = all.filter(place => {
      const loc = place.geometry?.location;
      return loc ? distanceMeters(center, loc) <= SEARCH_RADIUS_M : false;
    });
  }

  const spots = await placesToStudySpots(all);

  // Use explicit intent if provided, otherwise fall back to first query
  const ranked = await rankSpots(spots, intent || queries[0]);

  return ranked;
}

export interface SpotFilters {
  minRating?: number;
  categories?: string[];
}

// Applies the rating and category filters from the results page
export function filterStudySpots(spots: StudySpot[], filters: SpotFilters): StudySpot[] {
  return spots.filter(spot => {
    // Rating filter
    if (filters.minRating !== undefined && (spot.rating ?? 0) < filters.minRating) return false;

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      const category = getCategoryFromTypes(spot.types, spot.name);
      if (!filters.categories.includes(category)) return false;
    }

    return true;
  });
}

// Helper function to determine the category type of spots
// Checks the name first, since Google's types can be too general
function getCategoryFromTypes(types?: string[], name?: string): string {
  const nameLower = name?.toLowerCase() || "";
  const typeSet = new Set(types || []);

  // Name-based
  if (nameLower.includes("library")) return "Library";
  if (nameLower.includes("student") || nameLower.includes("university") || nameLower.includes("school")) return "Student Lounge";
  if (nameLower.includes("cafe") || nameLower.includes("coffee")) return "Café/Coffee Shop";

  // Type-based
  if (typeSet.has("library")) return "Library";
  if (typeSet.has("cafe") || typeSet.has("coffee_shop")) return "Café/Coffee Shop";
  if (typeSet.has("university") || typeSet.has("school") || typeSet.has("student_center")) return "Student Lounge";

  return "Study Spot";
}
