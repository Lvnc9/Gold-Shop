# Changelog

## 2026-10-10
- Fix: checkout no longer flashes "Your bag is empty" while leaving for the confirmation page.

## 2026-10-09
- Initial architecture: Vite + React + TS single-file build for the Artifact host (ADR-0001).
- Procedural 3D renderer with 12 product models, light-box environment, alloy materials, engraving (ADR-0002).
- Storefront: home (hero, marquee, collections rail, karat explorer, atelier, guarantees), catalogue with filters,
  product configurator, bag drawer, checkout, confirmation, owner ledger.
- Published v1 to https://claude.ai/artifact/JJGTBHeupW18JKGitJyCfo; seeded `config/spot`; root DB writes locked to the owner.
- Orders in the Artifact DB with copy-summary fallback; spot price from `config/spot` (ADR-0003).
