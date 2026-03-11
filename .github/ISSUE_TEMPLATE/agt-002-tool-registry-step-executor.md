---
name: "AGT-002 Implement Tool Registry and Step Executor"
about: "Execute planner output instead of fixed hardcoded orchestration"
title: "AGT-002: Implement Tool Registry and Step Executor"
labels: ["agentic", "orchestration"]
assignees: []
---

## Summary
Replace static orchestrator sequencing with plan-driven execution via a tool registry.

## Scope
Build a registry that maps plan tool IDs to callable functions and a generic step execution loop.

## Target Files
- `src/lib/agents/orchestrator.ts`
- `src/lib/agents/utils/llm-helpers.ts`
- `src/lib/agents/types/index.ts`

## Deliverables
- [ ] Add tool registry abstraction in orchestrator
- [ ] Add generic step executor for `InvestigationPlan.steps`
- [ ] Normalize step outputs into a shared result format
- [ ] Remove dependence on fixed order for core workflow

## Acceptance Criteria
- [ ] Orchestrator executes planned steps from `createPlan()`
- [ ] Unknown tool IDs fail safely with explicit error state
- [ ] Step outputs are captured in a structured execution log

## Dependencies
AGT-001

## Implementation Tasks
- [ ] Define tool handler interface and registry map
- [ ] Implement step dispatch and result collection
- [ ] Add per-step timeout and retry strategy
- [ ] Update orchestration result assembly from dynamic steps

