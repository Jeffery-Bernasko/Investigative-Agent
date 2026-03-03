/**
 * Name Similarity Engine
 * Provides fuzzy name matching using Levenshtein distance with normalization.
 */

// ═══════════════════════════════════════════════════════
// Normalization
// ═══════════════════════════════════════════════════════

/**
 * Normalize a name string for comparison:
 * - Lowercase
 * - Remove diacritics / accent marks
 * - Strip non-alphanumeric (except spaces)
 * - Collapse whitespace
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .toLowerCase()
    .replace(/-/g, " ")              // hyphen → space (hyphenated names become tokens)
    .replace(/[^a-z0-9\s]/g, "")    // remove remaining special characters
    .replace(/\s+/g, " ")
    .trim();
}

// ═══════════════════════════════════════════════════════
// Damerau-Levenshtein Distance (Optimal String Alignment)
// ═══════════════════════════════════════════════════════

/**
 * Compute the Damerau-Levenshtein (Optimal String Alignment) edit distance.
 * Counts insertions, deletions, substitutions, and adjacent transpositions.
 * Transpositions count as a single edit, which improves matching of
 * common spelling variants (e.g. "Jeffrey" ↔ "Jeffery").
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const lenA = a.length;
  const lenB = b.length;

  // d[i][j] = distance between a[0..i-1] and b[0..j-1]
  const d: number[][] = Array.from({ length: lenA + 1 }, (_, i) =>
    Array.from({ length: lenB + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,        // deletion
        d[i][j - 1] + 1,        // insertion
        d[i - 1][j - 1] + cost  // substitution
      );
      // Adjacent transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
      }
    }
  }

  return d[lenA][lenB];
}

// ═══════════════════════════════════════════════════════
// Similarity Score
// ═══════════════════════════════════════════════════════

/**
 * Compute a similarity score (0–1) between two strings based on
 * Levenshtein distance.  Score = 1 - distance / max(len(a), len(b)).
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - damerauLevenshteinDistance(a, b) / maxLen;
}

// ═══════════════════════════════════════════════════════
// Abbreviated-name helper
// ═══════════════════════════════════════════════════════

/**
 * Returns true if `abbreviated` could be an abbreviation of `full`
 * (e.g. "J" matches "John", or "J." matches "John").
 */
function isAbbreviationOf(abbreviated: string, full: string): boolean {
  const abbr = abbreviated.replace(/\./g, "");
  if (abbr.length === 0) return false;
  return full.startsWith(abbr) && abbr.length < full.length;
}

// ═══════════════════════════════════════════════════════
// Main name-similarity entry point
// ═══════════════════════════════════════════════════════

/**
 * Compute a similarity score (0–1) between two full names.
 *
 * Strategy:
 *  1. Exact match after normalization → 1.0
 *  2. Token-level matching — compare individual name parts
 *     (supports abbreviations like "J." matching "John")
 *  3. Whole-string Levenshtein as a fallback
 *
 * The returned value uses the weighted scheme requested in the PRD:
 *   - first-name and last-name carry equal weight within the token score.
 */
export function computeNameSimilarity(nameA: string, nameB: string): number {
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);

  if (normA === normB) return 1.0;

  const tokensA = normA.split(" ").filter(Boolean);
  const tokensB = normB.split(" ").filter(Boolean);

  // Whole-string similarity as a baseline
  const wholeSim = stringSimilarity(normA, normB);

  // Token-level similarity — pair each token from A with the best match in B
  if (tokensA.length > 0 && tokensB.length > 0) {
    let tokenScoreSum = 0;

    for (const tA of tokensA) {
      let best = 0;
      for (const tB of tokensB) {
        // Abbreviation bonus
        if (isAbbreviationOf(tA, tB) || isAbbreviationOf(tB, tA)) {
          best = Math.max(best, 0.85);
        }
        const sim = stringSimilarity(tA, tB);
        if (sim > best) best = sim;
      }
      tokenScoreSum += best;
    }

    const tokenScore = tokenScoreSum / tokensA.length;

    // Use the higher of whole-string vs token score
    return Math.max(wholeSim, tokenScore);
  }

  return wholeSim;
}
