import { findFeatures } from "../../tags";

// Words that name a kind of place, and the category they mean
// Longer phrases first, so "coffee shop" is removed before "coffee"
const CATEGORY_WORDS: [string, string[]][] = [
  ["Boba/Tea Shop", ["bubble tea", "milk tea", "boba shops", "boba shop", "boba", "tea shops", "tea shop", "tea house"]],
  ["Café/Coffee Shop", ["coffee shops", "coffee shop", "cafés", "cafes", "café", "cafe", "coffee"]],
  ["Library", ["libraries", "library"]],
  ["Student Lounge", ["student unions", "student union", "student lounges", "student lounge", "student center", "campus"]],
];

// Words that don't say anything about what the user needs
const FILLER = new Set([
  "a", "an", "the", "with", "and", "that", "has", "have", "near", "for", "to", "in", "of",
  "some", "somewhere", "place", "places", "spot", "spots",
]);

// What "need" to rank by when the query only names a kind of place
const DEFAULT_NEEDS = "good place to study";

export interface ParsedQuery {
  category: string | null; // Kind of place asked for, matched against Google's place types
  needs: string; // What the user wants from the place, matched against reviews (never empty)
  features: string[]; // Study features named in the needs (e.g. "outlets"), for an exact keyword boost
}

// Splits a query like "cafe with outlets" into the kind of place ("Café/Coffee Shop")
// and what the user needs ("outlets"), so the category word doesn't drown out the need
export function parseQuery(query: string): ParsedQuery {
  let text = query.toLowerCase();
  let category: string | null = null;

  for (const [name, phrases] of CATEGORY_WORDS) {
    for (const phrase of phrases) {
      // Whole words only (works with accents, unlike \b)
      const pattern = new RegExp(`(?<![a-zà-ÿ])${phrase}(?![a-zà-ÿ])`, "g");
      if (pattern.test(text)) {
        category ??= name;
        text = text.replace(pattern, " ");
      }
    }
  }

  const needs = text
    .split(/\s+/)
    .filter(word => word && !FILLER.has(word))
    .join(" ");

  // If they only named a kind of place (e.g. "cafe"), rank those places by how good they are to study in
  return { category, needs: needs || DEFAULT_NEEDS, features: findFeatures(needs) };
}
