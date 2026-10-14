# Solenne — gold atelier storefront

A visually led gold-jewellery ordering site (English, USD). Every product image is rendered live in the browser with three.js; there are no photos. One source builds two ways (ADR-0004):
- **Artifact build**: one self-contained HTML page published as a claude.ai Artifact, orders in the Artifact's shared database.
- **API build**: the same SPA behind nginx, backed by a Django/DRF API (`backend/`) with Postgres, Redis and Kafka monitoring (`docker-compose.yml`, see `docs/backend.md`).

## Read this first (rule for every agent)

1. **Do not crawl the repository.** Before changing anything, read only:
   - this file,
   - `.claude/` (`project-map.md`, `conventions.md`, `commands/`) — local only, git-ignored and not on GitHub;
     if it is missing, the same information lives in `docs/architecture.md` and `docs/design-system.md`,
   - `docs/` (start with `docs/architecture.md`, then the doc for the area you touch).
   Open source files only when `.claude/project-map.md` points you to them for the task at hand.
2. **Keep the docs true.** Any architectural change (new module or folder, new dependency, new data path or DB rule, routing change, build or publish step, rendering pipeline change) must, in the same change:
   - update `docs/architecture.md` and the area doc (`design-system.md`, `3d-rendering.md`, `data-model.md`, `deployment.md`, `backend.md`),
   - add an ADR in `docs/adr/` (next number, format in `docs/adr/README.md`),
   - update `.claude/project-map.md`,
   - add a line to `docs/CHANGELOG.md`,
   - update this file if the summary, commands or constraints below change.
   Small, non-architectural edits (copy, a colour tweak, a new product using an existing model) only need the CHANGELOG line.

## Git workflow

- Branch `main`, remote `origin` = public GitHub repo (see `docs/deployment.md`). `.claude/` is git-ignored.
- **Commit after every self-contained change**, never batch unrelated work. Use Conventional Commits:
  `feat(scope): …`, `fix(scope): …`, `docs: …`, `refactor(scope): …`, `chore: …`, `style(scope): …`.
  Scopes match top-level areas: `three`, `domain`, `ui`, `motion`, `services`, `build`, `docs`, `backend`, `infra`.
- A change that touches architecture commits code and its doc/ADR updates together.
- Push to `origin main` after each finished task.

## Commands

```bash
npm install          # pinned versions; do not bump casually (see docs/adr/0001-stack.md)
npm run dev          # local dev server (http://localhost:5173)
npm run build        # typecheck + single-file build + artifactize -> dist/artifact.html
npm run preview      # serve dist/ on :4173
npm run dev:api      # API build dev server; proxies /api to Django on :8000
npm run build:api    # API build -> dist-api/ (nginx image builds this itself)
npm run export:catalog   # src/domain -> backend/catalog/fixtures (run after product/pricing changes)
docker compose up -d --build   # full stack on http://localhost:8080 (needs .env from .env.example)
docker build --target dev -t solenne-api-test backend && docker run --rm solenne-api-test   # backend tests
```

Publish: run `/publish` (see `.claude/commands/publish.md`).
Live: https://claude.ai/artifact/JJGTBHeupW18JKGitJyCfo (details in `docs/deployment.md`). Source: https://github.com/Lvnc9/Gold-Shop (public).
README media (teaser + GIFs, recorded from the real build) live in `docs/media/`.

## Stack (one line each)

React 19 + TypeScript · Vite 8 + `vite-plugin-singlefile` · three.js 0.186 (procedural models, baked light-box environment) · `motion` for UI transitions · GSAP ScrollTrigger + Lenis for scroll · Phosphor icons · Google Fonts: Bodoni Moda / Manrope / IBM Plex Mono.
Backend (API build): Django 5.2 + DRF + SimpleJWT · Postgres 17 · Redis 7 · Kafka 3.9 (KRaft, confluent-kafka) · gunicorn · nginx 1.29 · Docker Compose.

## Hard constraints from the Artifact host (break these and the page silently fails)

They bind the Artifact build. Shared UI code must keep working under them; API-only code lives in
`src/services/backend/api.ts` + `http.ts`, reached only through the `#backend` alias, and is never in the Artifact bundle.

- Only scripts from cdnjs / jsdelivr / unpkg and stylesheets from Google Fonts load; **no other network requests** (no image URLs, no fetch to APIs). Everything is bundled into the page.
- The host wraps the page in its own `<html><head><body>`: `scripts/artifactize.mjs` strips those from the build. `<title>` must stay in the first 8 KB.
- Only bare `#token` hashes reach the page: routes are `#shop`, `#shop-rings`, `#p-<slug>`, `#checkout`, `#order`. No query strings, no `#a=b`.
- No `alert/confirm/prompt`, no file downloads, no `window.print`, `mailto:` unreliable: build confirmations in-page and show contact details as copyable text.
- Every colour comes from tokens in `src/styles/tokens.css` with light + dark definitions (see `docs/design-system.md`).
- DB (`claude.use("db")`) can be `null`, and outside visitors on a public link cannot write: checkout always has the copy-summary fallback (see `docs/data-model.md`). The API build keeps the same fallback for when the API is unreachable.
- Server prices are authoritative in the API build: after changing `src/domain` products or pricing, run `npm run export:catalog` so `backend/tests/test_pricing.py` stays green.
- Respect `prefers-reduced-motion` (Lenis, scrubbing and auto-rotation turn off).

## Where things live

See `.claude/project-map.md` for the full map. In short: `src/domain` (catalog + pricing, pure), `src/three` (renderer, materials, models, snapshots), `src/motion` (Lenis/GSAP), `src/services` (orders, spot price, storage; `backend/` adapters), `src/state` (stores), `src/components` (UI), `src/pages` (routes), `backend/` (Django: `catalog`, `orders`, `monitoring`), `infra/nginx/`, `docker-compose.yml`.
