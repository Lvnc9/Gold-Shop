---
description: Add a product to the catalogue (optionally with a new 3D model)
---

1. Read `docs/data-model.md` (product schema, pricing) and, for a new shape, `docs/3d-rendering.md`.
2. Add the entry to `PRODUCTS` in `src/domain/products.ts` (slug, category, variants with grams and `scale`,
   karats, colours, finishes, making/premium, defaults). Keep 24k yellow-only.
3. Reusing an existing `model` needs nothing else. For a new shape:
   - add the kind to `ModelKind` in `src/domain/types.ts`,
   - write a factory in the matching `src/three/models/*.ts` using `Kit` (+ `anchor` if engravable),
   - register it in `src/three/models/index.ts`,
   - this is architectural: update `docs/3d-rendering.md`, `.claude/project-map.md`, add an ADR if it introduces
     a new technique.
4. `npm run dev`, check the card render and the product page (all colours, karats, finishes, engraving).
5. CHANGELOG line, commit `feat(domain): add <name>`, then `/publish`.
