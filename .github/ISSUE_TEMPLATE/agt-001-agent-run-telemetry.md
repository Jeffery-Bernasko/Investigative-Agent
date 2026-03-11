---
name: "AGT-001 Add Agent Run Telemetry and Trace Model"
about: "Capture step-level execution traces for agentic orchestration"
title: "AGT-001: Add Agent Run Telemetry and Trace Model"
labels: ["agentic", "observability", "orchestration"]
assignees: []
---

## Summary
Add structured telemetry for every investigation run so behavior and quality can be measured and replayed.

## Scope
Capture and persist execution traces with plan metadata, steps, tool calls, replans, confidence deltas, latency, and errors.

## Target Files
- `src/lib/agents/orchestrator.ts`
- `src/lib/agents/types/index.ts`
- `src/lib/db/schema.ts`

## Deliverables
- [ ] Add trace types in agent domain model
- [ ] Add DB schema for investigation trace persistence
- [ ] Log `planVersion`, `steps`, `toolCalls`, `replans`, `latencyMs`, `confidenceBefore`, `confidenceAfter`, `errors`
- [ ] Attach trace ID to investigation result payload

## Acceptance Criteria
- [ ] Every investigation stores a structured trace record
- [ ] Trace can be inspected post-run to understand execution decisions
- [ ] Trace includes both successful and failed steps

## Dependencies
None


## Implementation Tasks
- [ ] Define `InvestigationTrace` and related interfaces
- [ ] Create migration/schema update for trace persistence
- [ ] Instrument orchestrator step lifecycle logging
- [ ] Add trace serialization and safe error handling

