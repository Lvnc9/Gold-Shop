# Deployment

## Pipeline
```bash
npm run build
```
1. `tsc --noEmit` (strict typecheck)
2. `vite build` + `vite-plugin-singlefile` → `dist/index.html` (all JS/CSS inlined; fonts from Google Fonts)
3. `node scripts/artifactize.mjs` → `dist/artifact.html`: removes `<!doctype>/<html>/<head>/<body>`, puts `<title>`
   first, then font links, styles, `#root`, the module script. Fails if the title is not in the first 8 KB.

Publish `dist/artifact.html` with Claude's Artifact tool (see `.claude/commands/publish.md`).

## Live site
- URL: **https://claude.ai/artifact/JJGTBHeupW18JKGitJyCfo** (first published 2026-10-09, version 1)
- Seeded DB: `config/spot` = `{ perGram: 133.23, asOf: "2026-10-06" }`
- Visibility: private by default. To share: open the artifact on claude.ai → **Share** → turn on the public link
  (or share with your organisation). Viewers on a public link can browse and configure; see
  `data-model.md` → "Who can save an order".
- Icon: `ring`. Capabilities: `db` (rules in `data-model.md`) and `user`.

## Source
- GitHub (public since 2026-10-10): https://github.com/Lvnc9/Gold-Shop — branch `main`. `.claude/` is git-ignored.
- `docs/media/`: the README teaser (`teaser.mp4`, `teaser-preview.gif`) and feature GIFs, recorded from the production build.

## Local
```bash
npm run dev       # http://localhost:5173 (Artifact build; DB absent)
npm run dev:api   # API build; proxies /api, /admin to Django on :8000
npm run preview   # serves dist/ on http://localhost:4173
```
Outside claude.ai the DB is absent, so checkout always shows the copy-summary fallback.

## Self-hosted stack (API build)
Django/DRF + Postgres + Redis behind nginx, with Kafka monitoring ([backend.md](backend.md), ADR-0004).
```bash
cp .env.example .env          # DJANGO_SECRET_KEY, POSTGRES_PASSWORD, OWNER_EMAIL, OWNER_PASSWORD
docker compose up -d --build  # http://localhost:8080 (SPA + /api/v1 + /admin)
docker compose --profile tools up -d kafka-ui   # optional, http://localhost:8081
```
| Service | Image / build | Role |
|---|---|---|
| `nginx` | `infra/nginx/Dockerfile` (builds `dist-api/` with Node, then nginx 1.29) | :8080, SPA, proxy, rate limits, JSON logs, load balancing |
| `api` ×`API_REPLICAS` (3) | `backend/Dockerfile` (Python 3.13, gunicorn gthread 2×4) | REST API |
| `migrate` | same image, one-shot | migrate, collectstatic, `seed_catalog`, `ensure_owner` |
| `monitor` | same image | `manage.py consume_metrics` |
| `postgres` | postgres:17-alpine | data (`pg` volume) |
| `redis` | redis:7.4-alpine | cache + DRF throttle counters (no persistence) |
| `kafka` | apache/kafka:3.9.1 (KRaft, 1 broker) | event bus (`kafka` volume, 72 h retention) |
| `kafka-ui` | provectuslabs/kafka-ui (profile `tools`) | topic browser |

Behind HTTPS set `COOKIE_SECURE=true` and add the public origin to `DJANGO_CSRF_TRUSTED_ORIGINS` and
`DJANGO_ALLOWED_HOSTS`. Scale with `API_REPLICAS=5 docker compose up -d`; nginx re-resolves replicas every 10 s.
After changing products or pricing: `npm run export:catalog`, commit the fixtures, rebuild (the `migrate` job reseeds).

## Static hosting (no DB)
`dist/index.html` is a complete page and runs on any static host (Netlify, Vercel, GitHub Pages, S3). Routes are hash-only,
so no rewrites are needed. Orders fall back to the copyable summary.
