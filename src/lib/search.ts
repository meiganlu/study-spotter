import type { StudySpot } from "@/types";
import { geocodeAddress } from "./google/maps";
import { findStudySpots } from "./google/places";
import { rankSpots } from "./ranking/client";

export interface SearchResult {
  locationLabel: string; // "City, ST" for the results heading
  spots: StudySpot[];
}

// Runs a search: find the location, gather nearby spots from Google, then rank them
export async function searchStudySpots(location: string, intent: string): Promise<SearchResult> {
  // Turn the city or zip into coordinates
  const geocodeResults = await geocodeAddress(location);
  const loc = geocodeResults?.[0];

  // Location not found
  if (!loc) return { locationLabel: location, spots: [] };

  // Pull the city and state for the results heading
  let city = "";
  let state = "";
  (loc.address_components || []).forEach(c => {
    if (c.types.includes("locality")) city = c.long_name;
    if (c.types.includes("administrative_area_level_1")) state = c.short_name;
  });
  const locationLabel = city || state ? `${city}${city && state ? ", " : ""}${state}` : location;

  // One search per type of place near the searched area
  // Separate searches return more results than combining terms into one query
  const queries = [
    `cafe near ${locationLabel}`,
    `library near ${locationLabel}`,
    `coworking space near ${locationLabel}`,
    `student union near ${locationLabel}`,
    `boba tea near ${locationLabel}`,
  ];
  // Also search with the user's own words to find places outside these types
  // "study spot" gives Google context, so "outlets" means power outlets, not outlet malls
  if (intent.trim()) queries.push(`${intent.trim()} study spot near ${locationLabel}`);

  const spots = await findStudySpots(queries, loc.geometry.location);

  // Rank by what the user typed, or by a general study query if it's blank
  const ranked = await rankSpots(spots, intent.trim() || "a good place to study");

  return { locationLabel, spots: ranked };
}
