/**
 * Exports the TypeScript catalogue and a golden price table for the Django backend, so the server re-prices orders
 * with the same numbers the browser shows. src/domain stays the single source of truth; the backend's parity test
 * fails if its Python port drifts.
 *
 *   npm run export:catalog
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'backend/catalog/fixtures');
const GOLDEN_SPOT = 133.23;

const { module: products } = await runnerImport(resolve(root, 'src/domain/products.ts'));
const { module: pricing } = await runnerImport(resolve(root, 'src/domain/pricing.ts'));
const { module: format } = await runnerImport(resolve(root, 'src/domain/format.ts'));

const catalog = products.PRODUCTS.map((p) => ({
  slug: p.slug,
  name: p.name,
  category: p.category,
  colors: p.colors,
  karats: p.karats,
  variants: p.variants.map((v) => ({ label: v.label, grams: v.grams })),
  sizes: p.sizes ? { kind: p.sizes.kind, options: p.sizes.options, base: p.sizes.base } : null,
  finishes: p.finishes,
  engraving: p.engraving ? { maxChars: p.engraving.maxChars } : null,
  making: p.making ?? null,
  premium: p.premium ?? null,
  stones: p.stones ? p.stones.price : 0,
  defaults: p.defaults,
}));

const golden = [];
for (const p of products.PRODUCTS) {
  const sizes = p.sizes ? p.sizes.options : [undefined];
  for (const karat of p.karats) {
    const color = pricing.colorAllowed(karat, p.defaults.color) ? p.defaults.color : 'yellow';
    p.variants.forEach((variant, vi) => {
      for (const size of sizes) {
        for (const engraving of p.engraving ? ['', 'AB'] : ['']) {
          const config = { ...p.defaults, color, karat, variant: vi, size, engraving };
          golden.push({
            slug: p.slug,
            config,
            total: pricing.price(p, config, GOLDEN_SPOT).total,
            summary: `${format.configSummary(config)} · ${variant.label}`,
          });
        }
      }
    });
  }
}

mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
writeFileSync(resolve(out, 'price_golden.json'), JSON.stringify({ spot: GOLDEN_SPOT, cases: golden }, null, 2) + '\n');
console.log(`catalog.json: ${catalog.length} products · price_golden.json: ${golden.length} cases`);
