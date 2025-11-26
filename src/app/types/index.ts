export interface StudySpot {
  id: string;
  name: string;
  vicinity: string;
  rating?: number;
  geometry: { location: google.maps.LatLng };
  types?: string[];
  reviewMentions?: string[];
  photoUrl?: string;
}
