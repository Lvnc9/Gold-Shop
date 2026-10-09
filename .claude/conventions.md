# Conventions

## Code
- TypeScript strict; no `any` in app code. Domain code stays pure (no React/DOM imports).
- Components are function components; state lives in `src/state` stores when shared, `useState` when local.
- Comments explain *why* (constraints, physics, host rules), not what the next line does.
- Imports: relative paths; no barrel files except `src/three/models/index.ts`.

## Styling
- Every colour, font and radius comes from `src/styles/tokens.css`. Never hard-code a colour in a component rule,
  except inside the always-dark velvet box (`.velvet`), whose palette is identical in both themes by design.
- New tokens get a light value on `:root` and dark values in **both** dark blocks (media query and `[data-theme="dark"]`).
- Layout with flex/grid + `gap`. Gutter comes from `.wrap`. Nothing may make the page scroll sideways at 375 px.
- Icons: Phosphor only. `thin` for large decorative icons, `light`/`regular` in chrome, `duotone` in buttons, `fill` for on-states.
- Type: Bodoni Moda (display, italics for emphasis), Manrope (body/UI), IBM Plex Mono (numbers, hallmarks, specs).

## Motion
- Easing `[0.16, 1, 0.3, 1]` (expo-out) for UI; springs for selection pills (`layoutId`).
- Scroll reveals start from a **visible** state (translate only, never opacity 0 waiting on an observer).
- Respect `prefers-reduced-motion`: Lenis, scrubbed scroll, auto-sway and flicks are off.
- GSAP is only for scroll-driven scenes (rail pin, marquee). Everything else uses `motion`.
- Never let GSAP and `motion` write `transform` on the same element.

## 3D
- One renderer (`Stage.get()`); never create another `WebGLRenderer`.
- New geometry goes through a `Kit` so it is disposed; shared materials/textures are cached and never disposed.
- Units are centimetres; models are framed automatically, so absolute scale only matters within a model.

## Copy
- English, USD, real units (grams, troy ounces, US ring sizes, inches, millimetres, fineness 585/750/916/999.9).
- Buttons say what happens ("Add to bag", "Place order"); errors say how to fix them.

## Git
- Conventional Commits, one self-contained change per commit, scopes `three|domain|ui|motion|services|build|docs`.
- End commit messages with the `Co-Authored-By` line used in history.
