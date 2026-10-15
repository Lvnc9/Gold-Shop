import { bySlug } from '../domain/products';
import { price } from '../domain/pricing';
import type { CartLine, Config } from '../domain/types';
import type { OrderRecord } from '../services/orders';
import { load, save } from '../services/storage';
import { createStore } from './store';

export interface Spot {
  /** USD per gram of 24k (999.9) gold. */
  perGram: number;
  /** ISO date the price was taken. */
  asOf: string;
  source: 'built-in' | 'shop';
}

/** Built-in fallback: LBMA-style spot close of Oct 6, 2026 ($4,143.94/ozt). Overridden by DB `config/spot`. */
export const DEFAULT_SPOT: Spot = { perGram: 133.23, asOf: '2026-10-06', source: 'built-in' };

export const spotStore = createStore<Spot>(DEFAULT_SPOT);
export const cartStore = createStore<CartLine[]>(load('solenne.cart', []), (v) => save('solenne.cart', v));
export const wishStore = createStore<string[]>(load('solenne.wish', []), (v) => save('solenne.wish', v));

export interface Toast {
  id: number;
  text: string;
  icon?: 'bag' | 'heart' | 'check' | 'copy';
}
export const uiStore = createStore<{ cartOpen: boolean; toast: Toast | null; lastOrder: OrderRecord | null; isOwner: boolean }>({
  cartOpen: false,
  toast: null,
  lastOrder: null,
  // Set on load (App) and by ledger sign-in/out, so the footer link follows the session without a reload.
  isOwner: false,
});

export const setOwner = (isOwner: boolean) => uiStore.set((s) => ({ ...s, isOwner }));

let toastTimer = 0;
export function toast(text: string, icon?: Toast['icon']) {
  clearTimeout(toastTimer);
  uiStore.set((s) => ({ ...s, toast: { id: Date.now(), text, icon } }));
  toastTimer = window.setTimeout(() => uiStore.set((s) => ({ ...s, toast: null })), 2600);
}

export const openCart = (open = true) => uiStore.set((s) => ({ ...s, cartOpen: open }));

const sameConfig = (a: Config, b: Config) =>
  a.color === b.color && a.karat === b.karat && a.variant === b.variant && a.size === b.size && a.finish === b.finish && a.engraving === b.engraving;

export function addToCart(slug: string, config: Config, qty = 1) {
  cartStore.set((lines) => {
    const hit = lines.find((l) => l.slug === slug && sameConfig(l.config, config));
    if (hit) return lines.map((l) => (l === hit ? { ...l, qty: Math.min(l.qty + qty, 9) } : l));
    return [...lines, { id: Math.random().toString(36).slice(2, 10), slug, config, qty }];
  });
}

export const setQty = (id: string, qty: number) =>
  cartStore.set((lines) => (qty <= 0 ? lines.filter((l) => l.id !== id) : lines.map((l) => (l.id === id ? { ...l, qty: Math.min(qty, 9) } : l))));

export const clearCart = () => cartStore.set([]);

export function toggleWish(slug: string): boolean {
  const on = !wishStore.get().includes(slug);
  wishStore.set((w) => (on ? [...w, slug] : w.filter((s) => s !== slug)));
  return on;
}

export const FREE_SHIPPING_FROM = 500;
export const EXPRESS_FEE = 45;
export const INSURED_FEE = 25;

export function cartTotals(lines: CartLine[], spot: number, delivery: 'insured' | 'express' = 'insured') {
  let subtotal = 0;
  let count = 0;
  for (const l of lines) {
    const p = bySlug(l.slug);
    if (!p) continue;
    subtotal += price(p, l.config, spot).total * l.qty;
    count += l.qty;
  }
  const shipping = delivery === 'express' ? EXPRESS_FEE : subtotal >= FREE_SHIPPING_FROM || subtotal === 0 ? 0 : INSURED_FEE;
  return { subtotal, shipping, total: subtotal + shipping, count };
}
