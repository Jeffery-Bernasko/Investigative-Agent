---
name: "AGT-005 Remove Mock Relationship Data"
about: "Use evidence-only relationship inference from collected OSINT"
title: "AGT-005: Remove Mock Relationship Data"
labels: ["agentic", "relationships", "data-quality"]
assignees: []
---

## Summary
Eliminate mock profile generation and infer relationships only from real collected evidence.

## Scope
Delete synthetic data path and enforce minimum evidence requirements before creating relationships.

## Target Files
- `src/lib/agents/relationship-agent.ts`
- `src/lib/agents/tools/entity-extractor.ts`

## Deliverables
- [ ] Remove `getMockProfileData()` usage
- [ ] Ingest real profile text/posts/intel where available
- [ ] Add evidence threshold checks before persistence
- [ ] Add source attribution in relationship evidence

## Acceptance Criteria
- [ ] No relationship is generated from synthetic placeholder data
- [ ] Each relationship has explicit evidence source metadata
- [ ] Low-evidence candidates are withheld or flagged

## Dependencies
AGT-004

## Estimate
1.5 days

## Implementation Tasks
- [ ] Refactor relationship discovery input contract
- [ ] Add evidence quality scoring helper
- [ ] Gate DB writes behind evidence threshold
- [ ] Update logs and result payload for rejected candidates

