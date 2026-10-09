import { useSyncExternalStore } from 'react';
import type { Category } from './domain/types';

/**
 * Hash routes. The Artifact host passes only bare #tokens to the page
 * (letters, digits, . _ ~ -), so every route is one token:
 *   ''            home
 *   #shop         catalog          #shop-rings  catalog filtered by category
 *   #p-<slug>     product page
 *   #checkout     checkout         #order       confirmation of the last order
 *   #ledger       owner-only order list
 */
export type Route =
  | { name: 'home'; anchor?: string }
  | { name: 'shop'; category?: Category }
  | { name: 'product'; slug: string }
  | { name: 'checkout' }
  | { name: 'order' }
  | { name: 'ledger' };

const CATS = ['rings', 'necklaces', 'bracelets', 'earrings', 'bullion'];

export function parse(hash: string): Route {
  const h = hash.replace(/^#/, '');
  if (h === 'shop') return { name: 'shop' };
  if (h.startsWith('shop-') && CATS.includes(h.slice(5))) return { name: 'shop', category: h.slice(5) as Category };
  if (h.startsWith('p-')) return { name: 'product', slug: h.slice(2) };
  if (h === 'checkout' || h === 'order' || h === 'ledger') return { name: h };
  return { name: 'home', anchor: h || undefined };
}

const subscribe = (fn: () => void) => {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
};
const getHash = () => location.hash;

export function useHash(): string {
  return useSyncExternalStore(subscribe, getHash, getHash);
}

export function go(hash: string) {
  if (location.hash === hash || (hash === '#' && !location.hash)) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}
