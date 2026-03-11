---
name: "AGT-003 Add Reflection and Replan Loop"
about: "Introduce bounded execute-evaluate-replan behavior"
title: "AGT-003: Add Reflection and Replan Loop"
labels: ["agentic", "orchestration", "reasoning"]
assignees: []
---

## Summary
Add a bounded reflection loop so the orchestrator can adapt plans based on intermediate outcomes.

## Scope
Implement evaluation after each step batch and trigger replan when confidence is low or critical failures occur.

## Target Files
- `src/lib/agents/orchestrator.ts`
- `src/lib/agents/utils/llm-helpers.ts`

## Deliverables
- [ ] Add evaluator prompt/function for intermediate result quality
- [ ] Add replan trigger logic
- [ ] Add max-iterations and max-cost guardrails
- [ ] Persist replan events in trace

## Acceptance Criteria
- [ ] Investigation can replan at runtime when evidence quality is insufficient
- [ ] Loop is bounded by configurable limits
- [ ] Final output contains replan history

## Dependencies
AGT-002

## Estimate
1.5 days

## Implementation Tasks
- [ ] Add `evaluateStepResults()` helper
- [ ] Add `shouldReplan` decision function
- [ ] Implement `replanFromContext` prompt in LLM helpers
- [ ] Wire guardrails and fail-safe exit conditions

