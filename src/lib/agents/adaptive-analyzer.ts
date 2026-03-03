/**
 * Adaptive Depth Analyzer
 *
 * Uses lightweight heuristics (+ optional LLM fallback) to decide
 * the appropriate investigation depth for a given target.
 *
 * Depth levels:
 *   "quick"    — Unique name, rich data already found. Minimal extra work.
 *   "standard" — Default balanced investigation.
 *   "deep"     — Common name / ambiguous target. Requires disambiguation.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type InvestigationDepth = "quick" | "standard" | "deep";

export interface DepthDecision {
  depth: InvestigationDepth;
  reasoning: string;
  needsDisambiguation: boolean;
}

// ── Common name heuristics ────────────────────────────────────────────────────

/**
 * Simple list of first names that are statistically very common globally.
 * This drives "deep" depth + disambiguation triggers without needing an LLM call.
 */
const COMMON_FIRST_NAMES = new Set([
  "john", "james", "robert", "michael", "william", "david", "richard",
  "joseph", "charles", "thomas", "christopher", "daniel", "paul", "mark",
  "mary", "patricia", "jennifer", "linda", "barbara", "elizabeth", "susan",
  "jessica", "sarah", "karen", "lisa", "nancy", "betty", "margaret",
  "maria", "jose", "juan", "luis", "carlos", "jorge", "pedro", "antonio",
  "wei", "lei", "fang", "min", "jing", "ali", "omar", "ahmed",
  "oliver", "noah", "liam", "emma", "olivia", "ava", "isabella",
]);

function isCommonName(name: string): boolean {
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return COMMON_FIRST_NAMES.has(first);
}

// ── Data-richness check ───────────────────────────────────────────────────────

function isDataRich(initialFindings: any): boolean {
  const profileCount: number = initialFindings?.profiles?.length ?? 0;
  const emailCount: number = initialFindings?.emails?.length ?? 0;
  const domainCount: number = initialFindings?.domains?.length ?? 0;
  return profileCount >= 3 || (profileCount >= 1 && (emailCount + domainCount) > 0);
}

// ── Main decision function ────────────────────────────────────────────────────

/**
 * Determine the investigation depth based on the target and initial findings.
 *
 * Decision matrix:
 *   | Common name | Rich data | → Result
 *   |-------------|-----------|----------
 *   | yes         | any       | deep + disambiguation
 *   | no          | yes       | quick
 *   | no          | no        | standard
 *
 * @param target          - Raw investigation target (name, username, email, …)
 * @param initialFindings - Findings gathered so far (may be empty at bootstrap)
 * @param targetType      - Parsed target type from intent
 */
export function determineInvestigationDepth(
  target: string,
  initialFindings: any,
  targetType: string = "person"
): DepthDecision {
  // Non-person targets almost never need disambiguation
  if (targetType !== "person") {
    const rich = isDataRich(initialFindings);
    return {
      depth: rich ? "quick" : "standard",
      reasoning: `Non-person target (${targetType}). ${rich ? "Data is rich — quick scan sufficient." : "Standard depth selected."}`,
      needsDisambiguation: false,
    };
  }

  const common = isCommonName(target);
  const rich = isDataRich(initialFindings);

  if (common) {
    return {
      depth: "deep",
      reasoning: `"${target}" is a common name — deep investigation with disambiguation required to avoid false positives.`,
      needsDisambiguation: true,
    };
  }

  if (rich) {
    return {
      depth: "quick",
      reasoning: `Unique name "${target}" with rich initial data — quick verification pass sufficient.`,
      needsDisambiguation: false,
    };
  }

  return {
    depth: "standard",
    reasoning: `Standard investigation depth for "${target}".`,
    needsDisambiguation: false,
  };
}
