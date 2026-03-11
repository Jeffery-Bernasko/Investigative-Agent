---
name: "AGT-004 Make OSINT Agent Iterative Multi-Tool"
about: "Replace one-shot target branching with iterative evidence expansion"
title: "AGT-004: Make OSINT Agent Iterative Multi-Tool"
labels: ["agentic", "osint"]
assignees: []
---

## Summary
Convert OSINT agent execution from single-path branching into iterative, confidence-driven multi-tool chaining.

## Scope
Support pivoting between person, username, email, domain, and phone evidence in a single run.

## Target Files
- `src/lib/agents/osint-agent.ts`
- `src/lib/agents/tools/osint-tools.ts`

## Deliverables
- [ ] Add iterative run state (evidence graph or queue)
- [ ] Add pivot rules and confidence thresholds
- [ ] Add stop criteria for depth, time, and diminishing returns
- [ ] Return provenance for each discovered artifact

## Acceptance Criteria
- [ ] A person investigation can trigger username and domain/email follow-ups automatically
- [ ] Agent can run multiple tool families in one request
- [ ] Execution remains bounded and traceable

## Dependencies
AGT-002

## Estimate
2 days

## Implementation Tasks
- [ ] Add `pendingTargets` queue and dedupe set
- [ ] Implement pivot decision logic per finding type
- [ ] Add confidence update after each pivot
- [ ] Update output schema for provenance and pivot history

