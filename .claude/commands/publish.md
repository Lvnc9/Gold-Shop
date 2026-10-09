---
description: Build the site and republish it to its live Artifact URL
---

1. `npm run build` — must pass typecheck and print `artifactize: dist/artifact.html (… KB)`.
2. Optional: `npm run preview` and open http://localhost:4173 to smoke-test (no console errors).
3. Publish `dist/artifact.html` with the Artifact tool:
   - `url`: the live URL from `docs/deployment.md` (keeps the same link),
   - omit `icon` and omit `capabilities` (keeps the stored db/user rules) unless the DB rules changed —
     then pass the full `capabilities` object from `docs/data-model.md`.
4. Add a line to `docs/CHANGELOG.md`, commit (`build: publish …` or the feature commit), `git push origin main`.
