import { spotStore, toast } from '../../state/app';
import { load, save } from '../storage';
import type { OrderRecord, SaveResult } from '../orders';
import { api, ApiError, refresh, setAccess } from './http';
import type { Backend, MonitorStats, SignInResult } from './types';

const SPOT_POLL_MS = 60_000;

/**
 * Polls GET /spot/ with If-None-Match: an unchanged price costs a 304 with no body. Pauses while the tab is hidden
 * and catches up as soon as it is visible again.
 */
let watching = false;
function watchSpot() {
  if (watching) return;
  watching = true;
  let etag: string | null = null;
  let timer = 0;
  const tick = async () => {
    window.clearTimeout(timer);
    try {
      const r = await api<{ perGram: number; asOf: string }>('GET', '/spot/', undefined, etag ? { 'If-None-Match': etag } : {});
      if (r.status === 200) {
        etag = r.etag;
        spotStore.set({ perGram: r.data.perGram, asOf: r.data.asOf, source: 'shop' });
      }
    } catch {
      /* offline or rate-limited: keep the last price, try again next tick */
    }
    if (!document.hidden) timer = window.setTimeout(tick, SPOT_POLL_MS);
  };
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });
  tick();
}

interface PriceChanged {
  spot: { perGram: number; asOf: string };
  quote: { total: number };
}

/**
 * One POST: the server re-prices every line at its spot and stores the order in a single transaction. The client
 * code doubles as the Idempotency-Key, so a retry after a dropped response returns the same order instead of a
 * second one.
 */
async function saveOrder(order: OrderRecord): Promise<SaveResult> {
  const body = {
    customer: order.customer,
    delivery: order.delivery,
    lines: order.lines.map((l) => ({ slug: l.slug, config: l.config, qty: l.qty })),
    total: order.total,
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await api<OrderRecord>('POST', '/orders/', body, { 'Idempotency-Key': order.code });
      return { saved: true, order: r.data };
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'price-changed') {
          const b = e.body as unknown as PriceChanged;
          spotStore.set({ perGram: b.spot.perGram, asOf: b.spot.asOf, source: 'shop' });
          return { saved: false, reason: 'price-changed', total: b.quote.total };
        }
        if (e.status === 429) return { saved: false, reason: 'busy' };
        if (e.status < 500) return { saved: false, reason: 'error', message: e.message };
      }
      // Network error, timeout or 5xx: retrying with the same key is safe.
    }
  }
  return { saved: false, reason: 'offline' };
}

async function listAllOrders(): Promise<OrderRecord[]> {
  const all: OrderRecord[] = [];
  let path: string | null = '/orders/?limit=200';
  // Cursor pages; bounded so a huge history can't freeze the ledger.
  for (let page = 0; path && page < 10; page++) {
    const r: { data: { next: string | null; results: OrderRecord[] } } = await api('GET', path);
    all.push(...r.data.results);
    path = r.data.next ? r.data.next.slice(r.data.next.indexOf('/api/v1') + '/api/v1'.length) : null;
  }
  return all;
}

// Set after an owner signs in on this browser. Without it no refresh is attempted, so ordinary visitors never
// spend requests (or the auth rate limit) on a session they can't have.
const SESSION_HINT = 'solenne.ownerSession';

let ownerCheck: Promise<boolean> | null = null;
function viewerIsOwner(): Promise<boolean> {
  if (!load<boolean>(SESSION_HINT, false)) return Promise.resolve(false);
  ownerCheck ??= refresh()
    .then((ok) => {
      if (!ok) save(SESSION_HINT, false); // expired or signed out elsewhere
      return ok ? api<{ isOwner: boolean }>('GET', '/auth/me/').then((r) => r.data.isOwner) : false;
    })
    .catch(() => false);
  return ownerCheck;
}

async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    const r = await api<{ access: string; user: { isOwner: boolean } }>('POST', '/auth/token/', { email, password });
    setAccess(r.data.access);
    save(SESSION_HINT, r.data.user.isOwner);
    ownerCheck = Promise.resolve(r.data.user.isOwner);
    return r.data.user.isOwner ? { ok: true } : { ok: false, message: 'This account is not the shop owner.' };
  } catch (e) {
    const reachable = e instanceof ApiError && e.status < 500;
    return { ok: false, message: reachable ? e.message : 'Could not reach the atelier. Check your connection and try again.' };
  }
}

async function signOut() {
  await api('POST', '/auth/logout/').catch(() => undefined);
  setAccess(null);
  save(SESSION_HINT, false);
  ownerCheck = Promise.resolve(false);
  toast('Signed out');
}

async function monitorStats(): Promise<MonitorStats | null> {
  return api<MonitorStats>('GET', '/monitor/stats/?minutes=60')
    .then((r) => r.data)
    .catch(() => null);
}

export const backend: Backend = { ownerSignIn: true, watchSpot, saveOrder, listAllOrders, viewerIsOwner, signIn, signOut, monitorStats };
