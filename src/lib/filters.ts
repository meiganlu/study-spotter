import type { StudySpot } from "@/types";
import { getCategory } from "./categories";

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
      if (!filters.categories.includes(getCategory(spot))) return false;
    }

    return true;
  });
}
