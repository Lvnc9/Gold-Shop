import { spotStore } from '../../state/app';
import type { OrderRecord, SaveResult } from '../orders';
import { getDb, getUser } from '../runtime';
import type { Backend } from './types';

/**
 * The shop's spot price lives in DB doc `config/spot` ({ perGram, asOf }), written by the
 * owner (or by Claude via ArtifactData). The page cannot fetch market data itself (CSP),
 * so without that doc it keeps the built-in price from state/app.ts.
 */
let watching = false;
async function watchSpot() {
  if (watching) return;
  watching = true;
  const db = await getDb();
  if (!db) return;
  db.doc('config/spot').onSnapshot(
    (snap) => {
      const d = snap.data();
      const perGram = Number(d?.perGram);
      const asOf = typeof d?.asOf === 'string' ? d.asOf : '';
      if (snap.exists && perGram > 20 && perGram < 2000 && /^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
        spotStore.set({ perGram, asOf, source: 'shop' });
      }
    },
    () => {
      /* not readable for this viewer: keep the built-in price */
    },
  );
}

/**
 * Saves to `orders/<viewer id>/items/<code>` and bumps the `orders/<viewer id>` index doc
 * (so the owner can list customers). Rules: customers write only their own subtree; only
 * the owner reads across customers. See docs/data-model.md.
 */
async function saveOrder(order: OrderRecord): Promise<SaveResult> {
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
async function listAllOrders(): Promise<OrderRecord[]> {
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

async function viewerIsOwner(): Promise<boolean> {
  const user = await getUser();
  return user ? user.isOwner().catch(() => false) : false;
}

export const backend: Backend = { ownerSignIn: false, watchSpot, saveOrder, listAllOrders, viewerIsOwner };
