# Agent Core Completion And Hardening Plan

## Summary
- Target only the agent core in this phase: autonomous investigation, OSINT collection, relationship/deep analysis, investigation reporting, settings/runtime selection, and the jobs/worker path for long-running enrichment.
- Sequence the work as `stabilize baseline -> unify core data/runtime seams -> complete missing agent features -> verify no regressions`.
- Keep the current synchronous investigation UX working, but add hybrid async enrichment for slow scraping stages.
- Standardize on the newer `relationships` / `network_metrics` model as canonical, with compatibility retained for legacy `entity_relations`.
- Keep provider support pluggable across Ollama, Azure OpenAI, and OpenAI. Defer image/reverse-image OSINT to v2.

## Key Changes
- Stabilize the current baseline first.
  - Make the app and worker compile independently: exclude `worker/**` from the root TS build, keep worker type/build under `worker/tsconfig.json`, and fix the worker-local schema import mismatch.
  - Replace client-side auth usage inside server routes with one shared server-session helper based on `auth.api.getSession({ headers })`; use it in jobs/settings/investigation-adjacent APIs.
  - Clear the existing agent-adjacent type errors before feature work, especially in jobs routes, settings auth access, and touched auth/components.

- Add a shared AI runtime layer used by the orchestrator and agent-facing APIs.
  - Introduce a provider resolver with explicit capabilities for `chat`, `embeddings`, and `connection test`.
  - Resolution order: user-configured provider first, environment fallback second.
  - Extend settings API/UI to expose Ollama configuration plus separate chat/embedding model selection without removing existing Azure/OpenAI fields.
  - Keep existing API contracts working while allowing richer structured inputs.

- Make investigation execution durable and hybrid.
  - Keep `POST /api/investigate` compatible with `{ query }`, but add optional structured fields such as `scope` (`quick|standard|deep`) and `asyncEnrichment`.
  - Add `GET /api/investigate/[id]` to return the persisted investigation trace, merged findings, async stage status, and report availability.
  - Persist each investigation phase into `investigation_traces`: intent parse, OSINT, web enrichment, content scrape, risk analysis, relationship discovery, deep analysis, async jobs, completion/failure.
  - Use synchronous execution for the current quick/standard path; enqueue worker jobs only for slow profile scraping and retryable deep enrichment.

- Unify relationship storage without breaking current reads.
  - Create a relationship repository/service that treats `relationships` as canonical.
  - Add a backfill migration from `entity_relations` into `relationships`.
  - During the compatibility phase, legacy entity CRUD writes update both stores; legacy reads keep working through adapter mapping until fully migrated.
  - Compute `network_metrics` only from canonical `relationships`.

- Complete the agent-facing UX only where it directly serves the core flow.
  - Upgrade the investigation page to expose explicit scope selection, partial/async status, relationship summary, deep-analysis summary, and report download from stored investigation data.
  - Keep the OSINT search page on top of the orchestrator, but allow async enrichment metadata/job linkage when deeper scraping is triggered.
  - Do not productize the mock graph/search/dashboard AI surfaces in this phase; only preserve compatibility so they are not made worse by the core changes.

## Public API / Type Changes
- `POST /api/investigate`
  - Keep `query` supported.
  - Add optional `scope`, `asyncEnrichment`, and future-safe structured target metadata.
- `GET /api/investigate/[id]`
  - New read endpoint for trace state, merged findings, async progress, and report metadata.
- `POST /api/jobs` / `GET /api/jobs/[id]`
  - Keep existing endpoints but standardize auth, typed status payloads, and linkage to `investigationId` / `entityId`.
- Shared types to add:
  - `InvestigationScope`
  - `ProviderConfig` / `ResolvedProvider`
  - `InvestigationTraceStep`
  - `CanonicalRelationship`

## Test Plan
- Static checks:
  - Root app typecheck passes.
  - Worker build/typecheck passes separately.
  - Next build passes for touched routes/pages.
- Core API scenarios:
  - Investigation succeeds for username, person-name, domain, email, and phone targets.
  - Quick scope stays fully synchronous.
  - Standard/deep scope can return initial results plus async enrichment metadata when jobs are created.
  - Missing or failed providers degrade to partial results or configuration errors without crashing.
- Data/model scenarios:
  - Relationship backfill migrates existing `entity_relations` into canonical `relationships`.
  - Legacy entity CRUD still reads/writes relationships correctly during compatibility mode.
  - `network_metrics` stays in sync with canonical relationships.
- Regression scenarios:
  - Existing entity CRUD still works.
  - Existing tracking APIs still work.
  - Existing `/api/osint/search` still returns its current response shape.
  - PDF investigation report generation still works with both sync-only and enriched results.
- Worker scenarios:
  - Mock-mode worker processes queued jobs correctly.
  - Failed jobs retry and surface error state without corrupting investigation data.

## Assumptions And Defaults
- Scope is agent core only, not the full PRD.
- Image/reverse-image investigation is deferred.
- `relationships` / `network_metrics` are the long-term source of truth.
- No destructive schema removals in this phase; migrations are additive with backfill and compatibility.
- Existing free-text investigation UX remains supported even after structured scope controls are added.
