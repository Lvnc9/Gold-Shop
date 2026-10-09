# 3D rendering

All product imagery is generated in the browser with three.js 0.186; nothing is downloaded.

## Stage (one GL context)
`Stage.get()` lazily creates the only `WebGLRenderer` (alpha, antialias, `NeutralToneMapping`, exposure 1.1,
pixel ratio 1). Views manage device pixels themselves (DPR capped at 2).

`Stage.draw(scene, camera, w, h, ctx)` renders into the bottom-left `w×h` of the GL canvas (scissor + viewport) and
`drawImage`s that region into the target 2D canvas in the same task, so `preserveDrawingBuffer` is not needed.
The render loop runs only while at least one `LiveView` exists and only draws views that are on screen
(`IntersectionObserver`).

If WebGL is unavailable `Stage.get()` returns `null`; `ProductImage` shows a shimmer tile and `Viewer` shows a note.

## Lighting
`studio()` builds a light-box scene (dark warm room, overhead softbox, two strip lights, back kicker, warm fill and
floor bounce) and bakes it with `PMREMGenerator` into `scene.environment`. Metals read as polished gold because
they reflect bright panels against dark. Two directional lights add specular glints.

## Materials (`materials.ts`)
- `goldMaterial(color, karat, finish)` – cached `MeshPhysicalMaterial`, metalness 1. Base colour per alloy
  (`ALLOY` table; lower karat = paler; 24k only yellow). Roughness: polished 0.13, satin 0.34, hammered 0.2.
  Satin and hammered add a procedural normal map. White gold adds a light clearcoat (rhodium skin).
- `diamondMaterial()` – transmission 1, IOR 2.42, dispersion 4, flat-shaded 16-segment brilliant.
- `withBump` / `withNormal` – per-mesh clones carrying engraving or stamp textures (owned by the `Kit`).

## Textures (`textures.ts`)
All drawn on canvases: hammered dents, brushed streaks, herringbone chevrons, coin reeding (height → normal map);
band engraving (centred on u = 0, `flipY = false`, reads upright from above the front edge), monogram/inscription
faces, bar stamp (maker, weight, fineness, serial), round legend + compass star, sun relief.

## Models (`models/*`)
| Kind | Construction |
|---|---|
| solitaire | Lathe band (superellipse profile) + 4 claws, basket, gallery + brilliant |
| signet | band + tapered elliptical pedestal + engraved face disc |
| eternity | band + 22 instanced brilliants + 44 instanced claw beads |
| cuban | instanced flattened tori along a drape curve, alternately twisted |
| rope | three helical `TubeGeometry` strands around the drape curve |
| herringbone | custom ribbon geometry with chevron normal map |
| bangle | oval band + engraved liner |
| tennis | 41 instanced rounded-box settings + brilliants + claws on an ellipse |
| hoops | two open tori with posts |
| coin-pendant | coin body (edge, rims, sun obverse, engravable reverse) + bail |
| bar | bevelled extruded rounded rect + stamped face |
| round | reeded coin body with legend on both faces |

`Kit` tracks geometries and owned textures for disposal, swaps the gold material across all gold meshes,
rebuilds engraving textures, and exposes an `engravingAnchor()` (point + view direction) for the
"See engraving" camera.

## Framing
`ProductScene.frame()` centres the model on its bounding box and stores half-extents. `fit()` computes the camera
distance from those extents; `fitMode: 'spin'` leaves room for the sway, `'box'` frames tightly (snapshots).

## Live views
`LiveView` adds: sway (auto motion), optional `OrbitControls` (rotate only; wheel zoom disabled so the page scrolls),
button zoom with easing, `flick()` after material changes, pointer parallax (hero), `showInside()` (engraving),
`reset()`.

## Snapshots
`snapshot(product, config)` queues renders (one per idle slot after fonts load), encodes WebP blobs and caches the
URL per `snapshotKey` (slug, colour, karat, finish, variant, engraving).

## Adding a model
Write a factory `(o: BuildOptions) => Kit` in the matching file, use `Kit` helpers, set a flattering
`kit.root.rotation`, add an `anchor` for engravable surfaces, register it in `models/index.ts`.
