// Categories offered in the results page's category filter
export const CATEGORY_OPTIONS = ["Library", "Café/Coffee Shop", "Boba/Tea Shop", "Student Lounge"];

// Libraries, cafés, and student lounges are study spots by nature
// Any other kind of place (boba shops, bakeries, community centers...) has to be known for studying
const CORE_CATEGORIES = new Set(["Library", "Café/Coffee Shop", "Student Lounge"]);

// Places with these Google types are almost never study spots (e.g. outlet malls)...
const NOT_STUDY_TYPES = new Set([
  "shopping_mall", "department_store", "clothing_store", "shoe_store", "jewelry_store",
  "electronics_store", "furniture_store", "home_goods_store", "supermarket", "convenience_store",
  "liquor_store", "gas_station", "car_dealer", "car_repair", "car_wash", "gym", "night_club",
  "bar", "movie_theater", "bowling_alley", "casino", "amusement_park",
]);
// ...unless they're also one of these (e.g. a café inside a mall)
const STUDY_TYPES = new Set(["cafe", "library", "university", "school", "book_store"]);

// Boba and tea shops are recognized by name, since Google usually just calls them cafés
const BOBA_NAME = /\b(boba|bubble tea|milk tea|tea house|teahouse|tea bar)\b/;

// Determines the category shown for a spot (one shared version, so labels and filters always agree)
// Checks the name first, since Google's types can be too general
export function getCategory(types?: string[], name?: string): string {
  const nameLower = name?.toLowerCase() || "";
  const typeSet = new Set(types || []);

  // Name-based
  if (nameLower.includes("library")) return "Library";
  if (nameLower.includes("student") || nameLower.includes("university") || nameLower.includes("school")) return "Student Lounge";
  if (BOBA_NAME.test(nameLower)) return "Boba/Tea Shop";
  if (nameLower.includes("cafe") || nameLower.includes("coffee")) return "Café/Coffee Shop";

  // Type-based
  if (typeSet.has("library")) return "Library";
  if (typeSet.has("cafe") || typeSet.has("coffee_shop")) return "Café/Coffee Shop";
  if (typeSet.has("community_center")) return "Community Center";
  if (typeSet.has("park")) return "Outdoor Area";
  if (typeSet.has("university") || typeSet.has("school") || typeSet.has("student_center")) return "Student Lounge";

  return "Study Spot";
}

// True for places that clearly aren't somewhere to study, so they're dropped before fetching details
export function isClearlyNotAStudySpot(types?: string[]): boolean {
  const t = types || [];
  return t.some(type => NOT_STUDY_TYPES.has(type)) && !t.some(type => STUDY_TYPES.has(type));
}

// True when a place only belongs in the results if its reviews show people study there
// Coworking spaces count as core even though Google has no type for them
export function mustProveStudyFriendly(types?: string[], name?: string): boolean {
  if (/co-?working/.test(name?.toLowerCase() || "")) return false;
  return !CORE_CATEGORIES.has(getCategory(types, name));
}

// Emoji shown in a spot's details when it has no photo
export function getCategoryEmoji(types?: string[], name?: string): string {
  switch (getCategory(types, name)) {
    case "Library": return "📚";
    case "Café/Coffee Shop": return "☕";
    case "Boba/Tea Shop": return "🧋";
    case "Community Center": return "🏛️";
    case "Outdoor Area": return "🌳";
    case "Student Lounge": return "🎓";
    default: return "📍";
  }
}
