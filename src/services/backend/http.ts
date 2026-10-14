/**
 * Fetch wrapper for the self-hosted API (same origin through nginx, or the Vite dev proxy). Never bundled into
 * the Artifact build. The access token lives only in memory; the refresh token is an httpOnly cookie the
 * page can't read, so a reload costs one /auth/refresh/ call.
 */
const BASE = '/api/v1';
const TIMEOUT_MS = 12_000;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

let access: string | null = null;
let refreshing: Promise<boolean> | null = null;

export const setAccess = (token: string | null) => {
  access = token;
};

/** One refresh at a time: parallel 401s share it. */
export function refresh(): Promise<boolean> {
  refreshing ??= raw('POST', '/auth/refresh/', undefined, false)
    .then((r) => {
      setAccess((r.body as { access?: string }).access ?? null);
      return r.status === 200 && access !== null;
    })
    .catch(() => {
      setAccess(null);
      return false;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

interface RawResponse {
  status: number;
  body: unknown;
  etag: string | null;
}

async function raw(method: string, path: string, body?: unknown, auth = true, headers: Record<string, string> = {}): Promise<RawResponse> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + path, {
      method,
      signal: ctl.signal,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'fetch',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && access ? { Authorization: `Bearer ${access}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = res.status === 204 || res.status === 304 ? '' : await res.text();
    let parsed: unknown = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = {};
    }
    return { status: res.status, body: parsed, etag: res.headers.get('ETag') };
  } finally {
    clearTimeout(timer);
  }
}

/** JSON request with one silent token refresh on 401. Throws ApiError for any non-2xx/304. */
export async function api<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<{ status: number; data: T; etag: string | null }> {
  let r = await raw(method, path, body, true, headers);
  if (r.status === 401 && path !== '/auth/token/' && (await refresh())) r = await raw(method, path, body, true, headers);
  if (r.status >= 400) {
    const b = (r.body ?? {}) as Record<string, unknown>;
    throw new ApiError(r.status, String(b.error ?? 'error'), String(b.detail ?? 'Request failed.'), b);
  }
  return { status: r.status, data: r.body as T, etag: r.etag };
}
