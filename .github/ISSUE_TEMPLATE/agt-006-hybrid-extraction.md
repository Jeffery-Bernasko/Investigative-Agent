---
name: "AGT-006 Hybrid Entity and Relationship Extraction"
about: "Combine LLM candidate extraction with deterministic validation"
title: "AGT-006: Hybrid Entity and Relationship Extraction"
labels: ["agentic", "nlp", "extraction"]
assignees: []
---

## Summary
Improve extraction recall using LLM-generated candidates while preserving deterministic validation safeguards.

## Scope
Build a hybrid pipeline where model candidates are validated by existing regex/rule checks and merged with provenance.

## Target Files
- `src/lib/agents/tools/entity-extractor.ts`
- `src/lib/agents/base-agents.ts`

## Deliverables
- [ ] Add LLM candidate extraction helper
- [ ] Keep deterministic validation as acceptance gate
- [ ] Merge candidates with provenance (`llm`, `rule`, `both`)
- [ ] Emit confidence rationale for accepted entities/relationships

## Acceptance Criteria
- [ ] Extraction output includes provenance field
- [ ] Invalid LLM candidates are filtered by validator
- [ ] Quality improves without removing deterministic guardrails

## Dependencies
AGT-005

## Estimate
2 days

## Implementation Tasks
- [ ] Define candidate schema and parser
- [ ] Implement merge strategy for duplicate entities
- [ ] Add confidence blending rule
- [ ] Add unit-level tests for parser and validation paths

