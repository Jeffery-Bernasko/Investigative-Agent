---
name: "AGT-007 Hybrid Risk and Confidence Scoring"
about: "Blend deterministic baselines with model rubric and self-critique"
title: "AGT-007: Hybrid Risk and Confidence Scoring"
labels: ["agentic", "analysis", "scoring"]
assignees: []
---

## Summary
Replace purely threshold-driven scoring with a bounded hybrid model that preserves deterministic safety.

## Scope
Keep formula-based baseline, add model rubric scoring, then apply bounded adjustment with explicit rationale.

## Target Files
- `src/lib/agents/utils/analysis.ts`
- `src/lib/agents/tools/analysis-tools.ts`
- `src/lib/agents/tools/osint-tools.ts`

## Deliverables
- [ ] Add baseline score output to analysis payload
- [ ] Add rubric-based model score pass
- [ ] Add bounded adjustment function and self-critique
- [ ] Include reasoned score delta in final output

## Acceptance Criteria
- [ ] Output includes `baselineScore`, `adjustedScore`, and `scoreRationale`
- [ ] Score adjustment respects configured max delta bounds
- [ ] Deterministic fallback works when model scoring fails

## Dependencies
AGT-003, AGT-004

## Estimate
2 days

## Implementation Tasks
- [ ] Define rubric prompt and response schema
- [ ] Implement bounded adjustment policy
- [ ] Add fallback and error handling path
- [ ] Add regression checks for extreme cases

