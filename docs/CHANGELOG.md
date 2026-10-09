# Changelog

## 2026-10-09
- Initial architecture: Vite + React + TS single-file build for the Artifact host (ADR-0001).
- Procedural 3D renderer with 12 product models, light-box environment, alloy materials, engraving (ADR-0002).
- Storefront: home (hero, marquee, collections rail, karat explorer, atelier, guarantees), catalogue with filters,
  product configurator, bag drawer, checkout, confirmation, owner ledger.
- Orders in the Artifact DB with copy-summary fallback; spot price from `config/spot` (ADR-0003).
