// A place shown in the results
export interface StudySpot {
  id: string; // Google place ID
  name: string;
  vicinity: string; // Address
  rating?: number;
  geometry: { location: google.maps.LatLng };
  types?: string[]; // Google's place types (e.g. "cafe", "library")
  reviewMentions?: string[]; // Top 3 study features from reviews, shown as tags
  reviewText?: string; // Review text used for ranking
  photoUrl?: string;
}
