---
name: "AGT-010 Evaluation Harness and Feature-Flagged Rollout"
about: "Ship agentic orchestration safely with A/B comparison and metrics"
title: "AGT-010: Evaluation Harness and Feature-Flagged Rollout"
labels: ["agentic", "rollout", "evaluation"]
assignees: []
---

## Summary
Add a safe rollout path and evaluation harness to compare deterministic and agentic pipelines.

## Scope
Introduce feature flag controls, replay dataset runs, and side-by-side metrics for quality and performance.

## Target Files
- `src/lib/agents/orchestrator.ts`
- `src/app/api/investigate/route.ts`

## Deliverables
- [ ] Add `AGENTIC_ORCHESTRATION_V2` feature flag support
- [ ] Add replay mode for fixed input set
- [ ] Capture comparison metrics (`completionRate`, `precisionProxy`, `latencyMs`, `toolCost`)
- [ ] Add rollout checklist and fallback strategy

## Acceptance Criteria
- [ ] Can run deterministic and agentic modes in parallel
- [ ] Metrics are available for before/after comparison
- [ ] Rollback to deterministic path is one-flag operation

## Dependencies
AGT-002 through AGT-009

## Estimate
1.5 days

## Implementation Tasks
- [ ] Add feature flag branching in investigation entrypoint
- [ ] Build replay runner for benchmark queries
- [ ] Persist run comparison metrics
- [ ] Document rollout and rollback steps

