import { getEmbeddings } from "./embeddings";

// Reference descriptions of a good and a bad place to study
// Each review is compared to both, so study quality comes from what reviewers say,
// not from the star rating (which mostly reflects coffee, food, and service)
const GOOD_STUDY_SPOT =
  "Great place to study: quiet, plenty of outlets, fast wifi, lots of seating, " +
  "comfortable to stay for hours with a laptop.";
const BAD_STUDY_SPOT =
  "Bad place to study: loud, crowded, no outlets, no wifi, hard to find a seat, " +
  "time limits, not laptop friendly.";

export interface Anchors {
  good: Float32Array;
  bad: Float32Array;
}

// Embedded once per server instance, then reused for every request
let anchorsPromise: Promise<Anchors> | null = null;

export function getAnchors(): Promise<Anchors> {
  if (!anchorsPromise) {
    anchorsPromise = getEmbeddings([GOOD_STUDY_SPOT, BAD_STUDY_SPOT])
      .then(([good, bad]) => ({ good, bad }))
      .catch(err => {
        // Let the next request try again instead of caching the failure
        anchorsPromise = null;
        throw err;
      });
  }
  return anchorsPromise;
}
