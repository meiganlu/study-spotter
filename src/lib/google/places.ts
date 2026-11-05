import type { StudySpot } from "@/types";
import { runWithLimit, sleep } from "../async";
import { isClearlyNotAStudySpot, mustProveStudyFriendly } from "../categories";
import { extractTags, findFeatures } from "../tags";
import { ensureMapsLoaded } from "./maps";

// Max distance from the searched location (meters)
const SEARCH_RADIUS_M = 8000;

// Number of details requests running at once
const DETAILS_CONCURRENCY = 6;

// Review mentions that show people actually study at a place
const STUDY_EVIDENCE = ["study", "work", "outlets", "wifi", "quiet"];

// Places text search needs a map, so create a hidden one
function createHiddenService(): { service: google.maps.places.PlacesService; cleanup: () => void } {
  const offscreen = document.createElement("div");
  offscreen.style.width = "0";
  offscreen.style.height = "0";
  offscreen.style.position = "absolute";
  offscreen.style.left = "-9999px";
  document.body.appendChild(offscreen);

  const map = new google.maps.Map(offscreen);
  return { service: new google.maps.places.PlacesService(map), cleanup: () => offscreen.remove() };
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

// Google gives photo credits as an HTML link; pull out the name and URL
// so we can show them as plain text instead of injecting Google's HTML into the page
function parsePhotoCredit(html?: string): StudySpot["photoCredit"] {
  if (!html) return undefined;
  const link = new DOMParser().parseFromString(html, "text/html").querySelector("a");
  const name = (link?.textContent || html.replace(/<[^>]*>/g, "")).trim();
  return name ? { name, url: link?.getAttribute("href") || undefined } : undefined;
}

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

// Runs each Google search at the same time and keeps results near the searched location
async function searchNearby(queries: string[], center: google.maps.LatLng): Promise<google.maps.places.PlaceResult[]> {
  await ensureMapsLoaded();
  const { service, cleanup } = createHiddenService();

  const promises = queries.map(q => new Promise<google.maps.places.PlaceResult[]>(resolve => {
    // Bias results toward the searched location
    service.textSearch({ query: q, location: center, radius: SEARCH_RADIUS_M }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) resolve(results);
      else resolve([]);
    });
  }));

  const all = (await Promise.all(promises)).flat();
  cleanup();

  // Location is only a bias, so remove results that are too far away
  // (e.g. "Alameda" also matching places elsewhere in Alameda County)
  // Also drop places that clearly aren't study spots, before paying to fetch their details
  // (e.g. "outlets" bringing back outlet malls)
  return all.filter(place => {
    const loc = place.geometry?.location;
    if (!loc || distanceMeters(center, loc) > SEARCH_RADIUS_M) return false;
    return !isClearlyNotAStudySpot(place.types);
  });
}

// Requests a place's details (reviews, photos, etc.) and returns the status too
function requestDetails(
  placeId: string
): Promise<{ result: google.maps.places.PlaceResult | null; status: google.maps.places.PlacesServiceStatus }> {
  return new Promise((resolve) => {
    getDetailsService().getDetails(
      { placeId, fields: ["reviews", "photos"] },
      (result, status) => resolve({ result, status })
    );
  });
}

async function getPlaceDetails(placeId: string, attempts = 3): Promise<google.maps.places.PlaceResult | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const { result, status } = await requestDetails(placeId);
    if (status === google.maps.places.PlacesServiceStatus.OK && result) return result;

    // Retry only if Google is rate limiting — otherwise log the failure and move on
    // Without retries, a place silently ends up with no reviews or tags
    if (status !== google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
      console.warn(`Place details failed for ${placeId}: ${status}`);
      return null;
    }
    // Wait a little longer after each attempt
    await sleep(500 * attempt);
  }

  console.warn(`Place details rate-limited for ${placeId} after ${attempts} attempts`);
  return null;
}

// Finds nearby places and adds their tags, review text, and photo
export async function findStudySpots(queries: string[], center: google.maps.LatLng): Promise<StudySpot[]> {
  const places = await searchNearby(queries, center);

  // Keyed by place ID, so places found by more than one search only appear once
  const spots = new Map<string, StudySpot>();
  places.forEach(place => {
    if (!place.place_id || !place.name || !place.geometry?.location) return;
    spots.set(place.place_id, {
      id: place.place_id,
      name: place.name,
      vicinity: place.formatted_address || place.vicinity || "",
      rating: place.rating,
      ratingCount: place.user_ratings_total,
      geometry: { location: place.geometry.location },
      types: place.types,
      reviewMentions: [],
    });
  });

  // Fetch details for each place (reviews and photos)
  // Limited to a few at a time so Google doesn't throttle the requests
  await runWithLimit(Array.from(spots.values()), DETAILS_CONCURRENCY, async (spot) => {
    const details = await getPlaceDetails(spot.id);

    // Extract key terms from reviews, and keep each review's text for ranking
    if (details?.reviews) {
      spot.reviewMentions = extractTags(details.reviews);
      spot.reviews = details.reviews.map(r => r.text || "").filter(Boolean);
    }

    // Get photo URL and its author, which Google requires us to show with the photo
    if (details?.photos && details.photos.length > 0) {
      const photo = details.photos[0];
      spot.photoUrl = photo.getUrl({ maxWidth: 800, maxHeight: 600 });
      spot.photoCredit = parsePhotoCredit(photo.html_attributions[0]);
    }
  });

  // Places that aren't study spots by nature (boba shops, bakeries...) stay only if
  // reviewers mention studying there; good boba alone doesn't make a good study spot
  return Array.from(spots.values()).filter(
    spot => !mustProveStudyFriendly(spot.types, spot.name) || hasStudyEvidence(spot)
  );
}

// Whether a place's reviews mention studying, working, outlets, wifi, or quiet
function hasStudyEvidence(spot: StudySpot): boolean {
  const mentioned = findFeatures((spot.reviews ?? []).join(" "));
  return STUDY_EVIDENCE.some(feature => mentioned.includes(feature));
}
