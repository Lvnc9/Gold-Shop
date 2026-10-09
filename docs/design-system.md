# Design system

**Direction: "jewel box".** Quiet pages (alabaster in light, night-green in dark) and every live piece of gold shown
inside a dark velvet box (`.velvet`) that looks the same in both themes, like a jeweller's tray.

## Tokens (`src/styles/tokens.css`)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` / `--bg-raised` | #eceee8 / #f6f7f2 | #08130f / #0f1d18 | page / panels |
| `--ink` / `--ink-soft` / `--muted` | #12211c / #3c4a44 / #66746d | #ede6d6 / #c9c3b4 / #93a39b | text |
| `--line` / `--line-strong` | ink @ 12% / 22% | ivory @ 11% / 22% | rules, outlines |
| `--gold` | #9a6d16 | #e2b85a | gold as text/lines (AA on `--bg`) |
| `--gold-bright` | #d6a640 | #e2b85a | gold as fill |
| `--velvet*` | fixed | fixed | the jewel box (both themes) |

Neutrals carry a slight green bias toward the velvet so greys never look default.
Dark values are defined twice (media query + `[data-theme="dark"]`) per the Artifact theme contract.

## Type
| Role | Face | Notes |
|---|---|---|
| Display | Bodoni Moda (opsz axis) | headings; italics for the emphasised words, gold gradient in the hero |
| Body / UI | Manrope | 400–700 |
| Utility | IBM Plex Mono | prices in specs, grams, hallmarks, eyebrows; tabular numerals |

Scale: `--step--1 … --step-5` fluid clamps. Headings use `text-wrap: balance`.

## Components
- **Buttons**: `.btn--gold` (metallic gradient + light sweep on hover), `.btn--ghost`, `.btn--velvet-ghost`.
- **Hallmark chip** `.hallmark`: mono, outlined, shows fineness (585/750/916/999.9) — real stamps, not decoration.
- **Segmented control** `.seg` with a spring `layoutId` pill; **chips** `.chip[aria-pressed]`.
- **Product tile** `.pimg`: 4:5 velvet tile with the rendered snapshot and a shimmer while it renders.
- **Configurator steps** are numbered because the order of choices is real (colour → karat → size → variant → finish → engraving).

## Motion
| Moment | Tool | Spec |
|---|---|---|
| Hero headline | motion | words rise out of masks, 80 ms stagger, expo-out 1.1 s |
| Hero piece | three | slow ±0.55 rad sway + pointer parallax; cross-fade between 3 pieces every 7 s |
| Marquee | GSAP | loop 38 s; speed follows Lenis scroll velocity |
| Collections | GSAP ScrollTrigger | pinned horizontal track (≥ 900 px); native snap scroller on phones |
| Cards | motion | spring tilt toward pointer, glare follows pointer, image eases in from blur |
| Selection | motion | `layoutId` pills/rings slide between options |
| Prices | motion | `Money` rolls numbers over 0.7 s |
| Add to bag | motion | gold bead flies to the bag icon, badge pops |
| Page change | motion | fade/slide 0.5 s, scroll resets after exit |

Reduced motion turns off Lenis, scrubbed/pinned scroll, sway, flicks and CSS animations.

## Icons
Phosphor (`@phosphor-icons/react`), chosen for its six weights: thin for large decorative marks (hero facts,
atelier steps), light/regular for chrome, duotone inside buttons, fill for on-states (wishlist).
