// Categories offered in the results page's category filter
export const CATEGORY_OPTIONS = ["Library", "Café/Coffee Shop", "Student Lounge"];

// Determines the category shown for a spot (one shared version, so labels and filters always agree)
// Checks the name first, since Google's types can be too general
export function getCategory(types?: string[], name?: string): string {
  const nameLower = name?.toLowerCase() || "";
  const typeSet = new Set(types || []);

  // Name-based
  if (nameLower.includes("library")) return "Library";
  if (nameLower.includes("student") || nameLower.includes("university") || nameLower.includes("school")) return "Student Lounge";
  if (nameLower.includes("cafe") || nameLower.includes("coffee")) return "Café/Coffee Shop";

  // Type-based
  if (typeSet.has("library")) return "Library";
  if (typeSet.has("cafe") || typeSet.has("coffee_shop")) return "Café/Coffee Shop";
  if (typeSet.has("community_center")) return "Community Center";
  if (typeSet.has("park")) return "Outdoor Area";
  if (typeSet.has("university") || typeSet.has("school") || typeSet.has("student_center")) return "Student Lounge";

  return "Study Spot";
}

// Emoji shown in a spot's details when it has no photo
export function getCategoryEmoji(types?: string[]): string {
  if (!types) return "📍";

  if (types.includes("library")) return "📚";
  if (types.includes("cafe") || types.includes("coffee_shop")) return "☕";
  if (types.includes("community_center")) return "🏛️";
  if (types.includes("park")) return "🌳";
  if (types.includes("university") || types.includes("school")) return "🎓";

  return "📍";
}
