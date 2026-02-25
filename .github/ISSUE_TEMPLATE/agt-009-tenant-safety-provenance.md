---
name: "AGT-009 Tenant Safety and Finding Provenance"
about: "Enforce user-scoped lookup and provenance tracking for all findings"
title: "AGT-009: Tenant Safety and Finding Provenance"
labels: ["security", "multi-tenant", "agentic"]
assignees: []
---

## Summary
Fix cross-tenant data coupling and add provenance metadata for every derived finding.

## Scope
Enforce `userId` scoping in entity lookups and persist source metadata for findings and relationships.

## Target Files
- `src/lib/agents/tools/osint-tools.ts`
- `src/lib/agents/utils/result-mapper.ts`
- `src/lib/db/schema.ts`

## Deliverables
- [ ] Scope entity lookup by `name + userId`
- [ ] Add provenance fields (`sourceTool`, `sourceStep`, `sourceUrl`, `timestamp`)
- [ ] Persist provenance in findings/relationships output
- [ ] Add guardrails against cross-user entity reuse

## Acceptance Criteria
- [ ] Entity retrieval is tenant-safe
- [ ] Every finding has provenance metadata
- [ ] No investigation reads another user’s entity context by name-only lookup

## Dependencies
AGT-001

## Estimate
1 day

## Implementation Tasks
- [ ] Update DB query filters for user scope
- [ ] Extend result mapper with provenance injection
- [ ] Add schema updates for provenance persistence
- [ ] Add negative tests for cross-user lookup behavior

