import type { Config } from '../domain/types';
import { getDb, getUser } from './runtime';

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
  status: 'received';
}

export type SaveResult = { saved: true } | { saved: false; reason: 'offline' | 'signed-out' | 'read-only' | 'error' };

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function orderCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'SLN-' + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/**
 * Saves to `orders/<viewer id>/items/<code>` and bumps the `orders/<viewer id>` index doc
 * (so the owner can list customers). Rules: customers write only their own subtree; only
 * the owner reads across customers. See docs/data-model.md.
 */
export async function saveOrder(order: OrderRecord): Promise<SaveResult> {
  const [db, user] = await Promise.all([getDb(), getUser()]);
  if (!db || !user) return { saved: false, reason: db ? 'signed-out' : 'offline' };
  const id = await user.id();
  if (!id) return { saved: false, reason: 'signed-out' };
  try {
    await db.doc(`orders/${id}/items/${order.code}`).set(order as unknown as Record<string, unknown>);
    await db.doc(`orders/${id}`).set({ lastOrder: order.code, lastOrderAt: order.createdAt, name: order.customer.name });
    return { saved: true };
  } catch (e) {
    const code = (e as { code?: string })?.code;
    return { saved: false, reason: code === 'invalid_argument' || code === 'not_granted' ? 'read-only' : 'error' };
  }
}

/** Owner-only: every order, newest first. */
export async function listAllOrders(): Promise<OrderRecord[]> {
  const db = await getDb();
  if (!db) return [];
  const customers = await db.collection('orders').get();
  const all: OrderRecord[] = [];
  await Promise.all(
    customers.docs.map(async (c) => {
      const items = await db.collection(`orders/${c.id}/items`).get();
      items.docs.forEach((d) => {
        const data = d.data();
        if (data) all.push(data as unknown as OrderRecord);
      });
    }),
  );
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function viewerIsOwner(): Promise<boolean> {
  const user = await getUser();
  return user ? user.isOwner().catch(() => false) : false;
}

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
