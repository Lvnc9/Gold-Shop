import { ArrowsClockwise, Lock } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import { money } from '../domain/format';
import { listAllOrders, viewerIsOwner, type OrderRecord } from '../services/orders';

/** Owner-only list of every order saved to the Artifact DB. */
export function LedgerPage() {
  const [owner, setOwner] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<OrderRecord[] | null>(null);
  const refresh = useCallback(() => {
    setOrders(null);
    listAllOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, []);
  useEffect(() => {
    viewerIsOwner().then((o) => {
      setOwner(o);
      if (o) refresh();
    });
  }, [refresh]);

  if (owner === false)
    return (
      <div className="wrap checkout checkout--empty">
        <Lock size={40} weight="thin" />
        <h1>Owner only</h1>
        <p>The order ledger is visible to the shop’s owner.</p>
      </div>
    );

  return (
    <div className="wrap ledger">
      <div className="section__head">
        <div>
          <p className="eyebrow">Atelier</p>
          <h1>Order ledger</h1>
        </div>
        <button className="btn btn--ghost" onClick={refresh}>
          <ArrowsClockwise size={18} /> Refresh
        </button>
      </div>
      {orders === null ? (
        <p className="muted">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="muted">No orders yet. They appear here as soon as a customer places one.</p>
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
              {orders.map((o) => (
                <tr key={o.code}>
                  <td className="mono">{o.code}</td>
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
