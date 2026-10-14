import { ArrowsClockwise, Lock, SignOut, Spinner } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import { money } from '../domain/format';
import { listAllOrders, owner, viewerIsOwner, type OrderRecord } from '../services/orders';
import type { MonitorStats } from '../services/backend/types';

type Status = OrderRecord['status'];
const FILTERS: (Status | 'all')[] = ['all', 'received', 'confirmed', 'shipped', 'cancelled'];

/** Owner-only list of every order: Artifact DB in the Artifact build, the Django API in the self-hosted build. */
export function LedgerPage() {
  const [isOwner, setOwner] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<OrderRecord[] | null>(null);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const refresh = useCallback(() => {
    setOrders(null);
    listAllOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
    owner.stats?.().then(setStats);
  }, []);
  useEffect(() => {
    viewerIsOwner().then((o) => {
      setOwner(o);
      if (o) refresh();
    });
  }, [refresh]);

  if (isOwner === false)
    return owner.canSignIn ? (
      <SignIn
        onDone={() => {
          setOwner(true);
          refresh();
        }}
      />
    ) : (
      <div className="wrap checkout checkout--empty">
        <Lock size={40} weight="thin" />
        <h1>Owner only</h1>
        <p>The order ledger is visible to the shop’s owner.</p>
      </div>
    );

  const shown = orders && filter !== 'all' ? orders.filter((o) => (o.status ?? 'received') === filter) : orders;

  return (
    <div className="wrap ledger">
      <div className="section__head">
        <div>
          <p className="eyebrow">Atelier</p>
          <h1>Order ledger</h1>
        </div>
        <div className="ledger__actions">
          <button className="btn btn--ghost" onClick={refresh}>
            <ArrowsClockwise size={18} /> Refresh
          </button>
          {owner.signOut && (
            <button
              className="btn btn--ghost"
              onClick={() =>
                owner.signOut?.().then(() => {
                  setOwner(false);
                  setOrders(null);
                  setStats(null);
                })
              }
            >
              <SignOut size={18} /> Sign out
            </button>
          )}
        </div>
      </div>

      {stats && (
        <dl className="ledger__stats" aria-label={`Last ${stats.windowMinutes} minutes`}>
          {(
            [
              ['Orders, last hour', String(stats.orders)],
              ['Revenue, last hour', money(stats.revenue)],
              ['API requests / min', stats.perMinute.toFixed(1)],
              ['Server errors', `${(stats.errorRate * 100).toFixed(1)}%`],
              ['Avg / max latency', `${stats.avgMs.toFixed(0)} / ${stats.maxMs.toFixed(0)} ms`],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className="mono">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {owner.canSignIn && (
        <div className="ledger__filters" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {shown === null ? (
        <p className="muted">Loading orders…</p>
      ) : shown.length === 0 ? (
        <p className="muted">{filter === 'all' ? 'No orders yet. They appear here as soon as a customer places one.' : `No ${filter} orders.`}</p>
      ) : (
        <div className="table-scroll">
          <table className="ledger__table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Placed</th>
                <th>Customer</th>
                <th>Pieces</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.code}>
                  <td className="mono">
                    {o.code}
                    {owner.canSignIn && <small>{o.status}</small>}
                  </td>
                  <td>{new Date(o.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>
                    {o.customer.name}
                    <small>
                      {o.customer.email} · {o.customer.phone}
                    </small>
                    <small>
                      {o.customer.address}, {o.customer.city} {o.customer.postal}, {o.customer.country}
                    </small>
                  </td>
                  <td>
                    {o.lines.map((l, i) => (
                      <small key={i}>
                        {l.qty} × {l.name} — {l.summary}
                      </small>
                    ))}
                  </td>
                  <td className="mono">{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner.signIn) return;
    setBusy(true);
    setError('');
    const r = await owner.signIn(email.trim(), password);
    setBusy(false);
    if (r.ok) onDone();
    else setError(r.message);
  };

  return (
    <div className="wrap checkout checkout--empty ledger__signin">
      <Lock size={40} weight="thin" />
      <h1>Atelier sign-in</h1>
      <p>The order ledger is for the shop’s owner.</p>
      <form onSubmit={submit} noValidate>
        <div className="input">
          <label htmlFor="li-email">Email</label>
          <input id="li-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className={`input${error ? ' has-error' : ''}`}>
          <label htmlFor="li-password">Password</label>
          <input
            id="li-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? 'li-err' : undefined}
            required
          />
          {error && (
            <span id="li-err" className="input__err" role="alert">
              {error}
            </span>
          )}
        </div>
        <button type="submit" className="btn btn--gold btn--block" disabled={busy || !email || !password}>
          {busy ? (
            <>
              <Spinner size={18} className="spin" /> Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </div>
  );
}
