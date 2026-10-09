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
- URL: _set on first publish_
- Visibility: private by default. To share: open the artifact on claude.ai → **Share** → turn on the public link
  (or share with your organisation). Viewers on a public link can browse and configure; see
  `data-model.md` → "Who can save an order".
- Icon: `ring`. Capabilities: `db` (rules in `data-model.md`) and `user`.

## Source
- GitHub (private): https://github.com/Lvnc9/Gold-Shop — branch `main`.

## Local
```bash
npm run dev       # http://localhost:5173
npm run preview   # serves dist/ on http://localhost:4173
```
Outside claude.ai the DB is absent, so checkout always shows the copy-summary fallback.
