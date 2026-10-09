import type { Config, Karat, PriceBreakdown, Product } from './types';

/** Millesimal fineness: what the hallmark stamp says. */
export const FINENESS: Record<Karat, number> = { 24: 999.9, 22: 916, 18: 750, 14: 585 };
export const PURITY: Record<Karat, number> = { 24: 0.9999, 22: 0.916, 18: 0.75, 14: 0.585 };
export const GRAMS_PER_TROY_OUNCE = 31.1035;
export const ENGRAVING_FEE = 35;

/** Weight multiplier for the chosen size relative to the variant's base size. */
export function sizeFactor(product: Product, size?: string): number {
  const s = product.sizes;
  if (!s || !size) return 1;
  const cur = parseFloat(size);
  const base = parseFloat(s.base);
  if (!isFinite(cur) || !isFinite(base)) return 1;
  // Ring: ~3% metal per US size. Chains and bracelets scale with length.
  return s.kind === 'ring' ? 1 + (cur - base) * 0.03 : cur / base;
}

export function price(product: Product, config: Config, spotPerGram24k: number): PriceBreakdown {
  const variant = product.variants[config.variant] ?? product.variants[0];
  const grams = variant.grams * sizeFactor(product, config.size);
  const pureGrams = grams * PURITY[config.karat];
  const metal = pureGrams * spotPerGram24k;

  let making = 0;
  if (product.premium != null) making = metal * product.premium;
  else if (product.making) making = product.making.type === 'pct' ? metal * product.making.value : product.making.value;

  const stones = product.stones?.price ?? 0;
  const engraving = config.engraving.trim() ? ENGRAVING_FEE : 0;
  const total = Math.round(metal + making + stones + engraving);
  return { grams, pureGrams, metal, making, stones, engraving, total };
}

/** "From" price: cheapest allowed karat and lightest variant, no engraving. */
export function fromPrice(product: Product, spot: number): number {
  const karat = Math.min(...product.karats) as Karat;
  const totals = product.variants.map((_, i) =>
    price(product, { ...product.defaults, karat, variant: i, engraving: '', size: product.sizes?.base }, spot).total,
  );
  return Math.min(...totals);
}

/** Karat 24 is only made in yellow: pure gold can't be alloyed into rose or white. */
export function colorAllowed(karat: Karat, color: Config['color']): boolean {
  return karat !== 24 || color === 'yellow';
}
