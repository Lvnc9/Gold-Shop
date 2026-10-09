# ADR-0001: Frontend stack

**Status:** Accepted
**Date:** 2026-10-09

## Context
The site's purpose is visual: fluid motion, beautiful icons and a configurator. It must ship as one HTML file to the
Artifact host (scripts only from allowlisted CDNs, everything else inline) and stay maintainable by agents that
read docs rather than the whole tree.

## Decision
React 19 + TypeScript, built by Vite 8 with `vite-plugin-singlefile`. Motion: `motion` (ex-Framer Motion) for UI
transitions and layout animation, GSAP 3.15 + ScrollTrigger for scroll-driven scenes, Lenis for smooth scrolling.
3D: plain three.js 0.186. Icons: Phosphor. Fonts: Bodoni Moda, Manrope, IBM Plex Mono (Google Fonts).
All versions pinned exactly and at least two weeks old at adoption.

## Options considered
| Option | Pros | Cons |
|---|---|---|
| **React + Vite (chosen)** | largest ecosystem; `motion` layout animations; real source tree for docs | bundle includes React (~190 KB) |
| Single HTML + CDN UMD scripts | no build | React 19/three no longer ship UMD; hard to maintain |
| Svelte/Solid | smaller runtime | weaker motion/3D ecosystem for this use |
| R3F + drei for 3D | declarative | drei environment presets fetch HDRs from blocked hosts; extra weight |
| Lucide / Tabler icons | most stars | single stroke weight; Phosphor's thin/duotone weights suit jewellery |

Research inputs: GitHub star comparisons of animation libraries (Anime.js, Framer Motion, GSAP, Lottie) and icon
sets (Lucide ≈ 23k, Tabler ≈ 21k, Phosphor), three.js forum guidance on gold materials.

## Consequences
- Libraries are bundled into the page rather than loaded from a CDN (accepted: ~1.3 MB single file).
- GSAP and motion must never animate `transform` on the same element (documented in conventions).
- Upgrades are deliberate: bump, rebuild, re-test, new ADR if behaviour changes.
