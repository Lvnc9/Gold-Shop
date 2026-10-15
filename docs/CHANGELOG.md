# Changelog

## 2026-10-15
- `npm run export:catalog` writes the catalogue and a golden price table to `backend/catalog/fixtures/` for the backend.
- Self-hosted API build (ADR-0004): Django/DRF backend (`backend/`) with server-side re-pricing, idempotent orders,
  owner JWT sign-in, cursor-paged ledger, spot ETags; Kafka request/order/spot events with a rollup consumer and
  `/monitor/stats/`; nginx gateway (`infra/nginx/`) with rate limits, JSON logs and load balancing over 3 replicas;
  `docker-compose.yml`.
- Frontend: `#backend` alias selects the Artifact DB or the REST adapter at build time; `#ledger` gains sign-in,
  status filter and live stats in the API build; checkout handles a re-priced bag.
- Stack verified end to end (403 backend tests, compose through nginx). Fixes from that run: compose builds the
  `runtime` stage (not the test stage); nginx upstream zone renamed (clashed with the `api` rate-limit zone);
  the `orders` limit counts POSTs only; access log keeps the original method on error pages; `ensure_topics`
  creates Kafka topics before the monitor subscribes; tests never publish to Kafka.
- Footer ledger link follows owner sign-in/out without a reload (`uiStore.isOwner`); ledger stat tiles fill the last
  row at phone width; `ensure_topics` is a no-op when the topics exist (it crashed the second `migrate` run).

## 2026-10-10
- README rewritten as a product page: 60 s teaser with an original soundtrack, nine GIFs recorded from the build, deploy guide.
- Repository made public; `.claude/` removed from git and ignored.
- Fix: checkout no longer flashes "Your bag is empty" while leaving for the confirmation page.

## 2026-10-09
- Initial architecture: Vite + React + TS single-file build for the Artifact host (ADR-0001).
- Procedural 3D renderer with 12 product models, light-box environment, alloy materials, engraving (ADR-0002).
- Storefront: home (hero, marquee, collections rail, karat explorer, atelier, guarantees), catalogue with filters,
  product configurator, bag drawer, checkout, confirmation, owner ledger.
- Published v1 to https://claude.ai/artifact/JJGTBHeupW18JKGitJyCfo; seeded `config/spot`; root DB writes locked to the owner.
- Orders in the Artifact DB with copy-summary fallback; spot price from `config/spot` (ADR-0003).
