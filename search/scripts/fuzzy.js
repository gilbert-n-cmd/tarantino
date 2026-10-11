// scripts/fuzzy.js
// Levenshtein distance + "did you mean" suggestions

/**
 * Classic Levenshtein edit distance.
 * Returns the minimum number of single-character edits
 * (insert, delete, substitute) needed to change `a` into `b`.
 */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}

/**
 * Given a mistyped word and a list of candidates,
 * return the closest matches above a similarity threshold.
 */
export function findClosest(word, candidates, maxDistance = 2) {
  const lower = String(word || "").toLowerCase();
  if (!lower) return [];

  const scored = candidates.map(c => ({
    candidate: c,
    distance: levenshtein(lower, c.toLowerCase())
  }));

  return scored
    .filter(s => s.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .map(s => s.candidate);
}

