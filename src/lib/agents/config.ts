/**
 * Adaptive Investigation System — shared configuration constants.
 * All thresholds can be overridden via environment variables.
 */

// ── Profile Verification ──────────────────────────────────────────────────────

export const VERIFICATION_CONFIG = {
  /** Minimum confidence score (0–100) required to accept a profile. */
  minimumConfidence: Number(process.env.VERIFICATION_MIN_CONFIDENCE ?? 60),

  /**
   * When true, raises the acceptance threshold to 80 (paranoid mode).
   * When false, uses the balanced threshold (minimumConfidence).
   */
  strictMode: (process.env.VERIFICATION_STRICT_MODE ?? "false") === "true",

  enableCrossValidation: true,

  indicators: {
    name:       { weight: 0.4 },
    location:   { weight: 0.2 },
    employment: { weight: 0.2 },
    links:      { weight: 0.2 },
  },
} as const;

// ── Disambiguation ────────────────────────────────────────────────────────────

/**
 * Overall investigation confidence below this value triggers the
 * human-in-the-loop disambiguation checkpoint.
 */
export const DISAMBIGUATION_THRESHOLD = Number(
  process.env.DISAMBIGUATION_THRESHOLD ?? 70
);

// ── Tiered Validation ─────────────────────────────────────────────────────────

/** Name-similarity score (0–100) below which Tier-1 immediately rejects a profile. */
export const TIER1_QUICK_REJECT_THRESHOLD = Number(
  process.env.TIER1_QUICK_REJECT_THRESHOLD ?? 20
);

// ── Investigation Runtime ─────────────────────────────────────────────────────

/** Maximum allowed wall-clock time (ms) for a full investigation. */
export const INVESTIGATION_TIMEOUT_MS = Number(
  process.env.INVESTIGATION_TIMEOUT ?? 120_000
);
