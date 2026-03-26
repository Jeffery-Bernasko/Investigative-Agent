/**
 * Core domain models for the Investigative Agent.
 *
 * These are the canonical types used across search, scoring, analysis, and PDF generation.
 */

// ── Profile candidate ──────────────────────────────────────────────────────────

export interface ProfileCandidate {
  /** Normalised platform name (e.g. "GitHub", "LinkedIn"). */
  platform: string;
  /** Direct URL to the profile page. */
  url: string;
  /** Display name as shown on the platform (may be empty if unknown). */
  displayName: string;
  /** Username/handle on the platform (e.g. "johndoe"). */
  username: string;
  /** Confidence that this profile belongs to the target person (0–1). */
  confidence: number;
  /** Human-readable confidence label. */
  confidenceLabel: "high" | "medium" | "low";
  /** Ordered list of reasons contributing to the confidence score. */
  evidence: string[];
  /** Page title from search result. */
  pageTitle?: string;
  /** Description / snippet from search result. */
  description?: string;
  /** Avatar URL (remote). */
  avatarUrl?: string;
  /** Base64 data-URL for embedding in PDF. */
  avatarData?: string;
}

// ── Website candidate ─────────────────────────────────────────────────────────

export interface WebsiteCandidate {
  /** Normalised origin URL of the site. */
  url: string;
  /** Page title. */
  title: string;
  /** Snippet / description from search result. */
  description: string;
  /** Category of the site. */
  siteType: "personal" | "portfolio" | "blog" | "organization" | "other";
  /** Confidence score (0–1). */
  confidence: number;
  /** Human-readable confidence label. */
  confidenceLabel: "high" | "medium" | "low";
  /** Evidence items that contributed to the score. */
  evidence: string[];
}

// ── Footprint analysis ────────────────────────────────────────────────────────

export interface FootprintAnalysis {
  /** One-paragraph executive summary. */
  executiveSummary: string;

  /** Online presence breadth (how many platforms are active). */
  presence: {
    totalPlatforms: number;
    activePlatforms: string[];
    /** e.g. "extensive" | "moderate" | "limited" | "minimal" */
    breadth: "extensive" | "moderate" | "limited" | "minimal";
    breadthDescription: string;
  };

  /** Name / username / location consistency across profiles. */
  identityConsistency: {
    /** true if the same name pattern appears consistently. */
    nameConsistent: boolean;
    /** Unique username variants discovered. */
    usernameVariants: string[];
    /** e.g. "consistent" | "minor_variations" | "significant_variations" */
    consistencyLevel: "consistent" | "minor_variations" | "significant_variations";
    notes: string;
  };

  /** Risk signals (privacy / security concerns). */
  riskSignals: Array<{
    signal: string;
    severity: "high" | "medium" | "low";
    description: string;
  }>;

  /** Possible duplicate / impersonation accounts. */
  impersonationChecks: {
    flagged: boolean;
    details: string[];
  };

  /** Sensitive data exposure (PII found in snippets — redacted by default). */
  sensitiveExposure: {
    found: boolean;
    /** Partially-redacted items, e.g. ["Email: j***@example.com"]. */
    items: string[];
    cautionNote: string;
  };

  /** Actionable recommendations. */
  recommendations: string[];

  /** Limitations disclaimer. */
  limitations: string;
}

// ── Input parameters for a person investigation ──────────────────────────────

export interface PersonInvestigationInput {
  /** Full name of the target (required). */
  fullName: string;
  /** Optional: city/country/region hint. */
  location?: string;
  /** Optional: employer or organisation hint. */
  employer?: string;
  /** Optional: known username hints (try these on platforms). */
  usernameHints?: string[];
  /** When true, include unredacted PII snippets in the report (default: false). */
  includeRawPii?: boolean;
}
