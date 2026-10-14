import type { Config } from '../domain/types';
import { backend } from '#backend';

export interface Customer {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal: string;
  country: string;
  notes: string;
}

export interface OrderLine {
  slug: string;
  name: string;
  summary: string;
  qty: number;
  unit: number;
  config: Config;
}

export interface OrderRecord {
  code: string;
  createdAt: string;
  customer: Customer;
  delivery: 'insured' | 'express';
  lines: OrderLine[];
  spotPerGram: number;
  spotAsOf: string;
  subtotal: number;
  shipping: number;
  total: number;
  status: 'received' | 'confirmed' | 'shipped' | 'cancelled';
}

export type SaveResult =
  | { saved: true; order?: OrderRecord }
  | { saved: false; reason: 'offline' | 'signed-out' | 'read-only' | 'error' | 'busy'; message?: string }
  /** The server re-priced the bag at a newer spot; `total` is what the customer would pay now. */
  | { saved: false; reason: 'price-changed'; total: number };

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function orderCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'SLN-' + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

// Storage is chosen at build time (see services/backend/types.ts).
export const saveOrder = (order: OrderRecord) => backend.saveOrder(order);
export const listAllOrders = () => backend.listAllOrders();
export const viewerIsOwner = () => backend.viewerIsOwner();
/** Owner session controls; sign-in only exists in the self-hosted API build. */
export const owner = {
  canSignIn: backend.ownerSignIn,
  signIn: backend.signIn,
  signOut: backend.signOut,
  stats: backend.monitorStats,
};

export function orderText(o: OrderRecord): string {
  const lines = o.lines.map((l) => `• ${l.qty} × ${l.name} (${l.summary}) — $${(l.unit * l.qty).toLocaleString('en-US')}`);
  return [
    `Solenne order ${o.code}`,
    `Placed ${new Date(o.createdAt).toUTCString()}`,
    '',
    ...lines,
    '',
    `Subtotal $${o.subtotal.toLocaleString('en-US')} · Shipping $${o.shipping} · Total $${o.total.toLocaleString('en-US')}`,
    `Priced at spot $${o.spotPerGram.toFixed(2)}/g (${o.spotAsOf})`,
    `Delivery: ${o.delivery === 'express' ? 'Express insured courier' : 'Insured courier'}`,
    '',
    `${o.customer.name} · ${o.customer.email} · ${o.customer.phone}`,
    `${o.customer.address}, ${o.customer.city} ${o.customer.postal}, ${o.customer.country}`,
    o.customer.notes ? `Notes: ${o.customer.notes}` : '',
  ]
    .filter((x, i, a) => x !== '' || a[i - 1] !== '')
    .join('\n');
}

export const SHOP_CONTACT = 'concierge@solenne.example';
