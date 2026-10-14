# ADR-0004: Self-hosted Django backend with nginx and Kafka, alongside the Artifact build

**Status:** Accepted
**Date:** 2026-10-15

## Context
The Artifact DB (ADR-0003) can't accept orders from public visitors, prices are computed only in the browser, an
order is two unvalidated client writes, and there is no monitoring. The owner asked for a real backend
(Django/DRF), nginx for logging and request limiting, and Kafka for monitoring. The Artifact host blocks every
request to another origin, so the live Artifact page can never call such an API.

## Decision
Build the same source two ways, chosen at build time by the `#backend` import alias in `vite.config.ts`:
- **Artifact build** (`npm run build`, unchanged): `services/backend/artifact.ts`, Artifact DB, single file.
- **API build** (`npm run build:api`): `services/backend/api.ts`, talking to a Django/DRF API under `/api/v1`.

The self-hosted stack (`docker-compose.yml`) is nginx → 3 gunicorn replicas → Postgres + Redis, with Kafka
(KRaft) receiving request and business events and a consumer rolling them up for the owner's ledger. The server
re-prices orders with a Python port of `pricing.ts` that is checked against golden values exported from the
TypeScript (`npm run export:catalog`), so `src/domain` stays the single source of truth.

## Options considered
| Option | Pros | Cons |
|---|---|---|
| **Dual build, alias-selected adapter (chosen)** | Artifact keeps working; no API code in the Artifact bundle; one UI | two builds to test |
| Replace the Artifact with the self-hosted site | one build | loses the live claude.ai URL |
| Runtime switch (detect `window.claude`) | one bundle | ships fetch code into a host that forbids it; dead code both ways |
| Catalogue in the DB, served to the SPA | editable without a deploy | the 3D models and configurator are code anyway; two sources of truth |

## Consequences
- Pricing or catalogue changes need `npm run export:catalog` and a backend redeploy; the parity test enforces it.
- Monitoring is best-effort: Kafka outages drop events but never fail requests.
- Throttle counters live in Redis so limits hold across replicas; a Redis outage disables DRF throttles (nginx
  limits still apply) and the spot cache falls through to Postgres.
- New conventional-commit scopes: `backend`, `infra`.
