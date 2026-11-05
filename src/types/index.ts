// A place shown in the results
export interface StudySpot {
  id: string; // Google place ID
  name: string;
  vicinity: string; // Address
  rating?: number;
  ratingCount?: number; // Number of Google ratings behind the rating
  geometry: { location: google.maps.LatLng };
  types?: string[]; // Google's place types (e.g. "cafe", "library")
  reviewMentions?: string[]; // Top 3 study features from reviews, shown as tags
  reviews?: string[]; // Review texts (up to 5) used for ranking
  photoUrl?: string;
  photoCredit?: { name: string; url?: string }; // Photo author, required by Google to show with the photo
}
