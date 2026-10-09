# ADR-0002: Procedural real-time 3D instead of photographs

**Status:** Accepted
**Date:** 2026-10-09

## Context
The shop needs product imagery that reacts to the customer's choices (karat, colour, finish, width, engraving).
The Artifact CSP blocks external images, and stock photos cannot change colour or carry an engraving.

## Decision
Model every product procedurally in three.js and render it live: one shared WebGL renderer, a baked light-box
environment, alloy-accurate physical materials, canvas-drawn engraving and stamp textures. Cards use cached
snapshots; the hero, karat explorer and product page use live views.

## Options considered
| Option | Pros | Cons |
|---|---|---|
| **Procedural 3D (chosen)** | reacts to every choice; no licensing; tiny payload | stylised, not photographic; needs WebGL |
| Bundled stock photos | photographic | static; licence tracking; MBs of base64 |
| Pre-rendered image sets per config | photographic-ish | combinatorial explosion (colour × karat × finish × variant) |

## Consequences
- Adding a product with a new shape means writing a model factory (see `/add-product`).
- Without WebGL the site shows shimmer tiles and a note instead of renders.
- One GL context avoids browser context limits even with many views.
