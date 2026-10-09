# Project map

Read this instead of crawling `src/`. Open a file only when the task touches its area.

## Entry & shell
| Path | Responsibility |
|---|---|
| `index.html` | Page shell: `<title>`, Google Fonts link, `#root`. The title is the Artifact's name. |
| `src/main.tsx` | Mounts `<App/>`, imports every stylesheet in cascade order. |
| `src/App.tsx` | Route → page switch, page transitions (`AnimatePresence`), global layers (header, footer, bag drawer, toast, fly-to-bag). Starts Lenis, spot-price watch, owner check. |
| `src/router.ts` | Hash routes (`#shop`, `#shop-<cat>`, `#saved`, `#p-<slug>`, `#checkout`, `#order`, `#ledger`, home anchors like `#atelier`). `go(hash)`. |

## Domain (pure, no React, no DOM)
| Path | Responsibility |
|---|---|
| `src/domain/types.ts` | `Product`, `Config`, `Variant`, `CartLine`, `PriceBreakdown`, `ModelKind`. |
| `src/domain/products.ts` | The catalogue (12 products) and `CATEGORIES`. Add products here. |
| `src/domain/pricing.ts` | `price()`, `fromPrice()`, `sizeFactor()`, fineness/purity tables, `colorAllowed()` (24k = yellow only). |
| `src/domain/format.ts` | Money/gram/ozt formatting, labels, `hallmark()`, `configSummary()`. |

## 3D (`src/three`) — see docs/3d-rendering.md
| Path | Responsibility |
|---|---|
| `stage.ts` | `Stage` (single WebGLRenderer + studio env), `ProductScene` (model + camera fit), `LiveView` (canvas-bound live view: sway, orbit, zoom, engraving camera). |
| `snapshots.ts` | Queued, cached card/cart renders → blob URLs. |
| `materials.ts` | Alloy colours per karat/colour, finish → roughness/normal map, diamond material, per-mesh bump/normal clones. |
| `textures.ts` | Canvas-drawn textures: hammered/brushed/chevron/reed normals, engraving, coin & bar stamps. |
| `models/kit.ts` | `Kit`: collects a model's meshes, swaps materials, rebuilds engraving textures, engraving anchor, disposal. |
| `models/parts.ts` | Shared geometry: ring band, brilliant-cut gem, rods, necklace drape curve, face frame, rounded rect. |
| `models/rings.ts`, `chains.ts`, `jewels.ts`, `bullion.ts` | One factory per `ModelKind`. |
| `models/index.ts` | `MODELS` registry and `geometryKey()` (what forces a rebuild). |

## State & services
| Path | Responsibility |
|---|---|
| `src/state/store.ts` | Tiny observable store + `useStore`. |
| `src/state/app.ts` | Stores: spot, cart, wishlist, UI (drawer/toast/last order). Cart actions, `cartTotals`, shipping fees, `DEFAULT_SPOT`. |
| `src/services/runtime.ts` | `getDb()` / `getUser()` around `window.claude.use()`; null outside claude.ai. |
| `src/services/spot.ts` | Live spot price from DB doc `config/spot`. |
| `src/services/orders.ts` | `OrderRecord`, `saveOrder()`, `listAllOrders()` (owner), `orderText()`, `SHOP_CONTACT`. |
| `src/services/storage.ts` | Throw-safe localStorage. |
| `src/types/claude.d.ts` | Minimal typing of the Artifact runtime calls we use. |

## Motion & hooks
| Path | Responsibility |
|---|---|
| `src/motion/smooth.ts` | Lenis + GSAP ScrollTrigger wiring, `scrollToTop`, `lockScroll`, `reducedMotion`. |
| `src/hooks/useLiveView.ts` | Binds a `LiveView` to a canvas for a component's lifetime. |
| `src/hooks/useSnapshot.ts` | Card/cart image URL for a product+config. |
| `src/hooks/useSpot.ts` | Current spot price. |

## UI
| Path | Responsibility |
|---|---|
| `src/components/layout/*` | Header, Footer (+`copyText`), CartDrawer, Toast, FlyLayer (`flyToCart`). |
| `src/components/home/*` | Hero, Marquee, CollectionsRail (GSAP pin), Featured, KaratStrip, Atelier, Guarantees. |
| `src/components/product/*` | Viewer (live 3D + toolbar), Configurator (stepped choices + engraving), PriceBlock (breakdown). |
| `src/components/ProductCard.tsx` | Catalogue card (tilt, glare, quick add, wishlist). |
| `src/components/ui/*` | `Money` (rolling number), `ProductImage` (snapshot tile), `Swatch`. |
| `src/pages/*` | HomePage, ShopPage, ProductPage, CheckoutPage, OrderPage, LedgerPage. |
| `src/styles/*` | `tokens.css` (all colours/type/space), `global.css` (base, buttons, chips, velvet), then one file per area. |

## Build & tooling
| Path | Responsibility |
|---|---|
| `vite.config.ts` | React + `vite-plugin-singlefile` → one HTML file. |
| `scripts/artifactize.mjs` | Strips the document skeleton → `dist/artifact.html` (what gets published). |
| `.claude/launch.json` | `dev` (5173) and `preview` (4173) servers for the browser pane. |
