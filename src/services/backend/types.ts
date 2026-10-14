import type { OrderRecord, SaveResult } from '../orders';

export interface MonitorStats {
  windowMinutes: number;
  requests: number;
  perMinute: number;
  errorRate: number;
  clientErrorRate: number;
  avgMs: number;
  maxMs: number;
  orders: number;
  revenue: number;
  routes: { method: string; route: string; requests: number; errors: number; avgMs: number; maxMs: number }[];
}

export type SignInResult = { ok: true } | { ok: false; message: string };

/**
 * Where orders and the spot price live. Chosen at build time through the `#backend` alias (vite.config.ts):
 * `artifact.ts` for the claude.ai Artifact (which may not call other hosts), `api.ts` for the self-hosted
 * Django API. Only one of them is ever in a bundle.
 */
export interface Backend {
  /** Owner can sign in from the page (API build); the Artifact knows the owner already. */
  readonly ownerSignIn: boolean;
  watchSpot(): void;
  saveOrder(order: OrderRecord): Promise<SaveResult>;
  listAllOrders(): Promise<OrderRecord[]>;
  viewerIsOwner(): Promise<boolean>;
  signIn?(email: string, password: string): Promise<SignInResult>;
  signOut?(): Promise<void>;
  monitorStats?(): Promise<MonitorStats | null>;
}
