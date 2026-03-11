---
name: "AGT-008 Unify OSINT API with Shared Agent Orchestration"
about: "Remove duplicated deterministic route logic and delegate to agent pipeline"
title: "AGT-008: Unify OSINT API with Shared Agent Orchestration"
labels: ["agentic", "api", "refactor"]
assignees: []
---

## Summary
Route `/api/osint/search` through shared orchestration to eliminate duplicated logic and inconsistent behavior.

## Scope
Refactor search route to use the same planner/executor path as investigation route.

## Target Files
- `src/app/api/osint/search/route.ts`
- `src/lib/agents/orchestrator.ts`
- `src/lib/agents/osint-agent.ts`

## Deliverables
- [ ] Replace local route branching with orchestration delegation
- [ ] Align response contract with shared result format
- [ ] Preserve existing auth/rate-limit concerns
- [ ] Remove redundant parsing/routing code

## Acceptance Criteria
- [ ] Search and investigate endpoints share one core orchestration path
- [ ] Route output remains API-compatible for frontend callers
- [ ] Duplicate deterministic branches are removed

## Dependencies
AGT-004

## Estimate
1.5 days

## Implementation Tasks
- [ ] Extract route-specific wrappers around orchestrator calls
- [ ] Map shared result object to current API response shape
- [ ] Remove duplicate helper functions no longer needed
- [ ] Validate route behavior for username/email/domain/phone requests

