"use client";

import { Loader } from "@googlemaps/js-api-loader";
import type { StudySpot } from "../types";

const loader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  version: "weekly",
  libraries: ["places"],
});

// Study-related keywords to search for in reviews
const STUDY_KEYWORDS = [
  "free wifi", "free wi-fi", "quiet", "co-working space", "outlets", "comfortable", "spacious", "cozy", "study", "work", "reading", "seating", "friendly staff", "bright", "natural light"
];

export async function ensureMapsLoaded(): Promise<void> {
  await loader.load();
}

export async function geocodeAddress(address: string): Promise<google.maps.GeocoderResult[] | undefined> {
  await ensureMapsLoaded();
  const geocoder = new google.maps.Geocoder();
  const res = await geocoder.geocode({ address });
  return res.results;
}

function extractKeyTerms(reviews?: google.maps.places.PlaceReview[]): string[] {
  if (!reviews || reviews.length === 0) return [];

  // Count number of keyword occurrences across all reviews
  const keywordCounts = new Map<string, number>();

  reviews.forEach(review => {
    const text = review.text?.toLowerCase() || "";

    STUDY_KEYWORDS.forEach(keyword => {
      // Count how many times the keyword appears
      const regex = new RegExp(`\\b${keyword.replace("-", "[-\\s]?")}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) {
        const normalizedKeyword = keyword.replace("-", " ");
        keywordCounts.set(
          normalizedKeyword,
          (keywordCounts.get(normalizedKeyword) || 0) + matches.length
        );
      }
    });
  });

  // Sort by count and return top 3 keywords
  return Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([keyword]) => keyword);
}

export async function getPlaceDetails(placeId: string): Promise<google.maps.places.PlaceResult | null> {
  await ensureMapsLoaded();

  const offscreen = document.createElement("div");
  offscreen.style.width = "0";
  offscreen.style.height = "0";
  offscreen.style.position = "absolute";
  offscreen.style.left = "-9999px";
  document.body.appendChild(offscreen);

  const map = new google.maps.Map(offscreen);
  const service = new google.maps.places.PlacesService(map);

  return new Promise((resolve) => {
    service.getDetails(
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
      (result, status) => {
        offscreen.remove();
        if (status === google.maps.places.PlacesServiceStatus.OK && result) {
          resolve(result);
        } else {
          resolve(null);
        }
      }
    );
  });
}

async function placesToStudySpots(places: google.maps.places.PlaceResult[]): Promise<StudySpot[]> {
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
  const detailsPromises = Array.from(map.keys()).map(async (placeId) => {
    const details = await getPlaceDetails(placeId);
    const spot = map.get(placeId);
    if (!spot) return;

    // Extract key terms from reviews
    if (details?.reviews) {
      const keyTerms = extractKeyTerms(details.reviews);
      spot.reviewMentions = keyTerms;
    }

    // Get photo URL
    if (details?.photos && details.photos.length > 0) {
      const photo = details.photos[0];
      spot.photoUrl = photo.getUrl({ maxWidth: 800, maxHeight: 600 });
    }
  });

  await Promise.all(detailsPromises);

  return Array.from(map.values()).sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

export async function textSearchMultiple(queries: string[]): Promise<StudySpot[]> {
  await ensureMapsLoaded();

  const offscreen = document.createElement("div");
  offscreen.style.width = "0";
  offscreen.style.height = "0";
  offscreen.style.position = "absolute";
  offscreen.style.left = "-9999px";
  document.body.appendChild(offscreen);

  const map = new google.maps.Map(offscreen);
  const service = new google.maps.places.PlacesService(map);

  const promises = queries.map(q => new Promise<google.maps.places.PlaceResult[]>(resolve => {
    service.textSearch({ query: q }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) resolve(results);
      else resolve([]);
    });
  }));

  const all = (await Promise.all(promises)).flat();

  offscreen.remove();

  const studySpots = await placesToStudySpots(all);

  return studySpots;
}

export interface SpotFilters {
  minRating?: number;
  categories?: string[]; 
}

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
