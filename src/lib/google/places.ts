import type { StudySpot } from "@/types";
import { isClearlyNotAStudySpot, mustProveStudyFriendly } from "../categories";
import { extractTags, findFeatures } from "../tags";
import { ensureMapsLoaded } from "./maps";

// Max distance from the searched location (meters)
const SEARCH_RADIUS_M = 8000;

// Review mentions that show people actually study at a place
const STUDY_EVIDENCE = ["study", "work", "outlets", "wifi", "quiet"];

// Everything we need about a place, fetched in the search itself (no separate details lookups)
// primaryType is what Google says the place mainly is, which decides its category
const PLACE_FIELDS = [
  "id", "displayName", "formattedAddress", "location", "rating", "userRatingCount",
  "primaryType", "types", "reviews", "photos",
];

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

// Runs one Google text search near the searched location (up to 20 places)
async function searchText(query: string, center: google.maps.LatLng): Promise<google.maps.places.Place[]> {
  try {
    const { places } = await google.maps.places.Place.searchByText({
      textQuery: query,
      fields: PLACE_FIELDS,
      // Bias results toward the searched location
      locationBias: { center, radius: SEARCH_RADIUS_M },
      maxResultCount: 20,
    });
    return places;
  } catch (err) {
    console.warn(`Search failed for "${query}":`, err);
    return [];
  }
}

// Whether a place's reviews mention studying, working, outlets, wifi, or quiet
function hasStudyEvidence(spot: StudySpot): boolean {
  const mentioned = findFeatures((spot.reviews ?? []).join(" "));
  return STUDY_EVIDENCE.some(feature => mentioned.includes(feature));
}

// Converts a Google place into a study spot
function toStudySpot(place: google.maps.places.Place, location: google.maps.LatLng): StudySpot {
  const reviews = (place.reviews ?? []).map(r => r.text || "").filter(Boolean);
  const photo = place.photos?.[0];
  const author = photo?.authorAttributions[0];

  return {
    id: place.id,
    name: place.displayName || "",
    vicinity: place.formattedAddress || "",
    rating: place.rating ?? undefined,
    ratingCount: place.userRatingCount ?? undefined,
    geometry: { location },
    primaryType: place.primaryType ?? undefined,
    types: place.types,
    reviews,
    reviewMentions: extractTags(reviews),
    photoUrl: photo?.getURI({ maxWidth: 800, maxHeight: 600 }),
    // Photo author, which Google requires us to show with the photo
    photoCredit: author ? { name: author.displayName, url: author.uri ?? undefined } : undefined,
  };
}

// Finds nearby study spots for all the searches, with their reviews, tags, and photo
export async function findStudySpots(queries: string[], center: google.maps.LatLng): Promise<StudySpot[]> {
  await ensureMapsLoaded();

  // Run all searches at the same time
  const places = (await Promise.all(queries.map(q => searchText(q, center)))).flat();

  // Keyed by place ID, so places found by more than one search only appear once
  const spots = new Map<string, StudySpot>();
  places.forEach(place => {
    const location = place.location;
    if (!place.displayName || !location || spots.has(place.id)) return;

    // Location is only a bias, so remove results that are too far away
    // (e.g. "Alameda" also matching places elsewhere in Alameda County)
    if (distanceMeters(center, location) > SEARCH_RADIUS_M) return;

    spots.set(place.id, toStudySpot(place, location));
  });

  return Array.from(spots.values()).filter(spot =>
    // Drop places that clearly aren't study spots (e.g. "outlets" bringing back outlet malls)
    !isClearlyNotAStudySpot(spot) &&
    // Places that aren't study spots by nature (boba shops, bakeries...) stay only if
    // reviewers mention studying there; good boba alone doesn't make a good study spot
    (!mustProveStudyFriendly(spot) || hasStudyEvidence(spot))
  );
}
