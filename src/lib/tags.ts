// Study-related features to search for in reviews
// Each tag maps to the words that count toward it (e.g. "plugs" counts as "outlets")
const STUDY_KEYWORDS: Record<string, string[]> = {
  "wifi": ["wifi", "wi-fi", "wi fi", "internet"],
  "outlets": ["outlets", "outlet", "plugs", "plug", "power outlets", "charging"],
  "quiet": ["quiet", "peaceful", "calm"],
  "co working space": ["co-working", "coworking", "co working"],
  "comfortable": ["comfortable", "comfy"],
  "spacious": ["spacious", "roomy"],
  "cozy": ["cozy", "cosy"],
  "study": ["study", "studying"],
  "work": ["work", "working", "laptop", "laptops"],
  "reading": ["reading"],
  "seating": ["seating", "seats", "tables"],
  "friendly staff": ["friendly staff"],
  "bright": ["bright"],
  "natural light": ["natural light", "sunlight"],
};

// Escapes special regex characters so phrases match exactly
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Counts how many times each study feature is mentioned in some text
function countFeatures(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const lower = text.toLowerCase();

  Object.entries(STUDY_KEYWORDS).forEach(([label, phrasings]) => {
    // Match any of the tag's words as whole words
    const pattern = phrasings.map(escapeRegex).join("|");
    const matches = lower.match(new RegExp(`\\b(?:${pattern})\\b`, "gi"));
    if (matches) counts.set(label, matches.length);
  });

  return counts;
}

// Which study features some text mentions (e.g. "cafe with plugs" → ["outlets"])
// Used for both the user's query and a place's reviews, so they match on the same words
export function findFeatures(text: string): string[] {
  return Array.from(countFeatures(text).keys());
}

// Finds the top 3 study features mentioned in a place's reviews
export function extractTags(reviews: string[]): string[] {
  if (reviews.length === 0) return [];

  const counts = countFeatures(reviews.join(" "));

  // Sort by count and return top 3 keywords
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([keyword]) => keyword);
}
