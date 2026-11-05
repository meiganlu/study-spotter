// Fields used to decide a place's category
interface PlaceInfo {
  primaryType?: string; // What Google says the place mainly is (e.g. "coffee_shop")
  types?: string[]; // All of Google's types for the place
  name?: string;
}

// Categories offered in the results page's category filter
export const CATEGORY_OPTIONS = [
  "Library", "Café/Coffee Shop", "Boba/Tea Shop", "Coworking Space", "Student Lounge", "Bookstore", "Bakery",
];

// Our category for each Google place type
const TYPE_CATEGORIES: Record<string, string> = {
  library: "Library",
  coworking_space: "Coworking Space",
  cafe: "Café/Coffee Shop",
  coffee_shop: "Café/Coffee Shop",
  coffee_roastery: "Café/Coffee Shop",
  cat_cafe: "Café/Coffee Shop",
  dog_cafe: "Café/Coffee Shop",
  tea_house: "Boba/Tea Shop",
  tea_store: "Boba/Tea Shop",
  university: "Student Lounge",
  school: "Student Lounge",
  book_store: "Bookstore",
  bakery: "Bakery",
  pastry_shop: "Bakery",
  cake_shop: "Bakery",
  bagel_shop: "Bakery",
  donut_shop: "Bakery",
  dessert_shop: "Bakery",
  community_center: "Community Center",
  park: "Outdoor Area",
};

// Google has no bubble tea type, so a café or tea place with a boba name is a boba shop
const BOBA_NAME = /\b(boba|bubble tea|milk tea)\b/;

// Libraries, cafés, coworking spaces, and student lounges are study spots by nature
// Any other kind of place (boba shops, bakeries, bookstores...) has to be known for studying
const CORE_CATEGORIES = new Set(["Library", "Café/Coffee Shop", "Coworking Space", "Student Lounge"]);

// Places that are mainly one of these are almost never study spots (e.g. outlet malls)
const NOT_STUDY_TYPES = new Set([
  "shopping_mall", "department_store", "clothing_store", "shoe_store", "jewelry_store",
  "electronics_store", "furniture_store", "home_goods_store", "supermarket", "grocery_store",
  "convenience_store", "liquor_store", "gas_station", "car_dealer", "car_repair", "car_wash",
  "gym", "night_club", "bar", "movie_theater", "bowling_alley", "casino", "amusement_park",
]);

// Determines a place's category from what Google says it is
// One shared version, so labels, filters, and ranking always agree
export function getCategory(place: PlaceInfo): string {
  const nameLower = place.name?.toLowerCase() || "";

  // Google's main type for the place, then its other types
  const fromGoogle =
    (place.primaryType && TYPE_CATEGORIES[place.primaryType]) ||
    place.types?.map(type => TYPE_CATEGORIES[type]).find(Boolean);

  // Refine to boba when Google calls it a café or tea place (or doesn't say) and the name says boba
  const cafeOrTea = !fromGoogle || fromGoogle === "Café/Coffee Shop" || fromGoogle === "Boba/Tea Shop";
  if (cafeOrTea && BOBA_NAME.test(nameLower)) return "Boba/Tea Shop";

  if (fromGoogle) return fromGoogle;

  // Google didn't say, so fall back to the name
  if (nameLower.includes("library")) return "Library";
  if (/co-?working/.test(nameLower)) return "Coworking Space";
  if (nameLower.includes("student") || nameLower.includes("university")) return "Student Lounge";
  if (nameLower.includes("cafe") || nameLower.includes("coffee")) return "Café/Coffee Shop";

  return "Study Spot";
}

// True for places that clearly aren't somewhere to study, so they're dropped from the results
export function isClearlyNotAStudySpot(place: PlaceInfo): boolean {
  if (place.primaryType) return NOT_STUDY_TYPES.has(place.primaryType);
  // No main type from Google: drop only if it has a non-study type and no study type
  const types = place.types || [];
  return types.some(type => NOT_STUDY_TYPES.has(type)) && !types.some(type => TYPE_CATEGORIES[type]);
}

// True when a place only belongs in the results if its reviews show people study there
export function mustProveStudyFriendly(place: PlaceInfo): boolean {
  return !CORE_CATEGORIES.has(getCategory(place));
}

// Emoji shown in a spot's details when it has no photo
export function getCategoryEmoji(place: PlaceInfo): string {
  switch (getCategory(place)) {
    case "Library": return "📚";
    case "Café/Coffee Shop": return "☕";
    case "Boba/Tea Shop": return "🧋";
    case "Coworking Space": return "💻";
    case "Student Lounge": return "🎓";
    case "Bookstore": return "📖";
    case "Bakery": return "🥐";
    case "Community Center": return "🏛️";
    case "Outdoor Area": return "🌳";
    default: return "📍";
  }
}
