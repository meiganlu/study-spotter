import { Loader } from "@googlemaps/js-api-loader";

// Loads the Google Maps JS API with the Places library
const loader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  version: "weekly",
  libraries: ["places"],
});

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
